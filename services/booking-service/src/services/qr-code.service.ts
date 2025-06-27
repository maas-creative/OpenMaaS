import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { BookingEntity } from '../entities/booking.entity';
import { BookingStatus } from '@openmaas/types';

interface QrCodeData {
  bookingId: string;
  userId: string;
  timestamp: number;
  validFor: number;
  nonce: string;
  checksum: string;
}

interface QrCode {
  data: string;
  expiresAt: Date;
  validFor: number;
}

interface QrCodeHistory {
  id: string;
  action: 'generated' | 'validated' | 'invalidated' | 'expired';
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  private readonly QR_CODE_VALIDITY_SECONDS = 30; // 30秒
  private readonly SECRET_KEY = process.env.QR_SECRET_KEY || 'default-secret-key';

  // In-memory storage for QR codes (in production, use Redis)
  private qrCodeCache = new Map<string, { data: QrCodeData; expiresAt: Date }>();
  private usedQrCodes = new Set<string>();
  private qrCodeHistory = new Map<string, QrCodeHistory[]>();

  constructor(
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
  ) {
    // Clean up expired QR codes every minute
    setInterval(() => this.cleanupExpiredQrCodes(), 60000);
  }

  async generateQrCode(bookingId: string, userId: string): Promise<QrCode> {
    // Verify booking ownership
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('QR code can only be generated for confirmed bookings');
    }

    // Create QR code data
    const timestamp = Date.now();
    const nonce = randomBytes(16).toString('hex');
    
    const qrData: QrCodeData = {
      bookingId,
      userId,
      timestamp,
      validFor: this.QR_CODE_VALIDITY_SECONDS,
      nonce,
      checksum: '',
    };

    // Generate checksum
    qrData.checksum = this.generateChecksum(qrData);

    // Store in cache
    const expiresAt = new Date(timestamp + this.QR_CODE_VALIDITY_SECONDS * 1000);
    const cacheKey = `${bookingId}:${userId}`;
    this.qrCodeCache.set(cacheKey, { data: qrData, expiresAt });

    // Record history
    this.addHistory(bookingId, {
      id: randomBytes(8).toString('hex'),
      action: 'generated',
      timestamp: new Date(),
      metadata: { validFor: this.QR_CODE_VALIDITY_SECONDS },
    });

    // Encode as base64
    const encodedData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    this.logger.log(`Generated QR code for booking ${bookingId}`);

    return {
      data: encodedData,
      expiresAt,
      validFor: this.QR_CODE_VALIDITY_SECONDS,
    };
  }

  async validateQrCode(qrData: string): Promise<{
    valid: boolean;
    booking?: BookingEntity;
    message: string;
  }> {
    try {
      // Decode QR data
      const decodedData = Buffer.from(qrData, 'base64').toString('utf-8');
      const qrCodeData: QrCodeData = JSON.parse(decodedData);

      // Check if already used
      const qrId = `${qrCodeData.bookingId}:${qrCodeData.nonce}`;
      if (this.usedQrCodes.has(qrId)) {
        this.logger.warn(`QR code already used: ${qrId}`);
        return {
          valid: false,
          message: 'QR code has already been used',
        };
      }

      // Verify checksum
      const expectedChecksum = this.generateChecksum({
        ...qrCodeData,
        checksum: '',
      });

      if (qrCodeData.checksum !== expectedChecksum) {
        this.logger.warn(`Invalid checksum for QR code: ${qrCodeData.bookingId}`);
        return {
          valid: false,
          message: 'Invalid QR code',
        };
      }

      // Check expiration
      const now = Date.now();
      const expiresAt = qrCodeData.timestamp + qrCodeData.validFor * 1000;
      
      if (now > expiresAt) {
        this.logger.warn(`Expired QR code: ${qrCodeData.bookingId}`);
        return {
          valid: false,
          message: 'QR code has expired',
        };
      }

      // Fetch booking
      const booking = await this.bookingRepository.findOne({
        where: { 
          id: qrCodeData.bookingId,
          userId: qrCodeData.userId,
        },
        relations: ['route', 'payment'],
      });

      if (!booking) {
        return {
          valid: false,
          message: 'Booking not found',
        };
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        return {
          valid: false,
          message: 'Booking is not confirmed',
        };
      }

      // Mark as used
      this.usedQrCodes.add(qrId);

      // Record history
      this.addHistory(qrCodeData.bookingId, {
        id: randomBytes(8).toString('hex'),
        action: 'validated',
        timestamp: new Date(),
        metadata: { validatedAt: now },
      });

      this.logger.log(`Validated QR code for booking ${qrCodeData.bookingId}`);

      return {
        valid: true,
        booking,
        message: 'QR code is valid',
      };
    } catch (error) {
      this.logger.error(`Error validating QR code: ${error.message}`);
      return {
        valid: false,
        message: 'Invalid QR code format',
      };
    }
  }

  async getCurrentQrCode(bookingId: string, userId: string): Promise<QrCode | null> {
    const cacheKey = `${bookingId}:${userId}`;
    const cached = this.qrCodeCache.get(cacheKey);

    if (!cached || cached.expiresAt < new Date()) {
      return null;
    }

    const encodedData = Buffer.from(JSON.stringify(cached.data)).toString('base64');

    return {
      data: encodedData,
      expiresAt: cached.expiresAt,
      validFor: this.QR_CODE_VALIDITY_SECONDS,
    };
  }

  async invalidateQrCodes(bookingId: string, userId: string): Promise<void> {
    // Verify ownership
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Remove from cache
    const cacheKey = `${bookingId}:${userId}`;
    this.qrCodeCache.delete(cacheKey);

    // Record history
    this.addHistory(bookingId, {
      id: randomBytes(8).toString('hex'),
      action: 'invalidated',
      timestamp: new Date(),
    });

    this.logger.log(`Invalidated QR codes for booking ${bookingId}`);
  }

  async getQrCodeHistory(bookingId: string, userId: string): Promise<QrCodeHistory[]> {
    // Verify ownership
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.qrCodeHistory.get(bookingId) || [];
  }

  private generateChecksum(data: Omit<QrCodeData, 'checksum'>): string {
    const content = JSON.stringify({
      ...data,
      secret: this.SECRET_KEY,
    });
    
    return createHash('sha256').update(content).digest('base64');
  }

  private addHistory(bookingId: string, entry: QrCodeHistory): void {
    const history = this.qrCodeHistory.get(bookingId) || [];
    history.push(entry);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    this.qrCodeHistory.set(bookingId, history);
  }

  private cleanupExpiredQrCodes(): void {
    const now = new Date();
    let cleaned = 0;

    // Clean cache
    for (const [key, value] of this.qrCodeCache.entries()) {
      if (value.expiresAt < now) {
        this.qrCodeCache.delete(key);
        cleaned++;

        // Record expiration in history
        const [bookingId] = key.split(':');
        this.addHistory(bookingId, {
          id: randomBytes(8).toString('hex'),
          action: 'expired',
          timestamp: now,
        });
      }
    }

    // Clean used QR codes older than 1 hour
    const oneHourAgo = Date.now() - 3600000;
    for (const qrId of this.usedQrCodes) {
      const [, nonce] = qrId.split(':');
      // Simple check based on nonce pattern (in production, store timestamp)
      if (this.usedQrCodes.size > 10000) {
        this.usedQrCodes.clear();
        this.logger.warn('Cleared used QR codes cache due to size limit');
        break;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired QR codes`);
    }
  }
}