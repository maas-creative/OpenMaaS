import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingProviderRepository } from '../repositories/booking-provider.repository';
import { ProviderService } from './provider.service';
import { NotificationService } from './notification.service';
import { CreateBookingDto, UpdateBookingDto, CancelBookingDto, BookingSearchDto, BookingResponseDto, BookingListResponseDto } from '../dto/booking.dto';
import { BookingStatus, BookingType } from '@openmaas/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly providerRepository: BookingProviderRepository,
    private readonly providerService: ProviderService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  async createBooking(userId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
    try {
      // Validate user booking limits
      await this.validateBookingLimits(userId);

      // Validate booking request
      await this.validateBookingRequest(dto);

      // Generate confirmation code
      const confirmationCode = this.generateConfirmationCode();

      // Calculate validity period
      const { validFrom, validUntil } = this.calculateValidityPeriod(dto.itinerary.startTime);

      // Create booking entity
      const booking = await this.bookingRepository.create({
        userId,
        tripId: dto.tripId,
        status: BookingStatus.PENDING,
        bookingType: dto.bookingType,
        passengers: dto.passengers,
        itinerary: dto.itinerary,
        fare: this.calculateFare(dto),
        confirmationCode,
        validFrom,
        validUntil,
        metadata: dto.metadata,
      });

      // Process booking with external providers
      await this.processProviderBooking(booking);

      // Send confirmation notification
      await this.notificationService.sendBookingConfirmation(booking);

      this.logger.log(`Booking created successfully: ${booking.id} for user ${userId}`);
      return this.toResponseDto(booking);
    } catch (error) {
      this.logger.error(`Error creating booking for user ${userId}:`, error);
      throw error;
    }
  }

  async getBookings(userId: string, search: BookingSearchDto): Promise<BookingListResponseDto> {
    const { bookings, total } = await this.bookingRepository.findAll(
      search.userId || userId,
      search.status,
      search.fromDate ? new Date(search.fromDate) : undefined,
      search.toDate ? new Date(search.toDate) : undefined,
      search.limit || 20,
      search.offset || 0,
    );

    return {
      bookings: bookings.map(this.toResponseDto),
      total,
      limit: search.limit || 20,
      offset: search.offset || 0,
    };
  }

  async getBooking(userId: string, bookingId: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied to this booking');
    }

    return this.toResponseDto(booking);
  }

  async getBookingByConfirmationCode(confirmationCode: string): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findByConfirmationCode(confirmationCode);
    
    if (!booking) {
      throw new NotFoundException(`Booking with confirmation code ${confirmationCode} not found`);
    }

    return this.toResponseDto(booking);
  }

  async updateBooking(userId: string, bookingId: string, dto: UpdateBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied to this booking');
    }

    if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
      throw new BadRequestException('Cannot update booking in current status');
    }

    const updated = await this.bookingRepository.update(bookingId, {
      passengers: dto.passengers || booking.passengers,
      metadata: { ...booking.metadata, ...dto.metadata },
    });

    // Sync changes with external providers
    await this.syncProviderBooking(updated);

    this.logger.log(`Booking updated successfully: ${bookingId}`);
    return this.toResponseDto(updated);
  }

  async cancelBooking(userId: string, bookingId: string, dto: CancelBookingDto): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Access denied to this booking');
    }

    if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
      throw new BadRequestException('Cannot cancel booking in current status');
    }

    // Check cancellation policy
    await this.validateCancellation(booking);

    // Cancel with external providers
    await this.cancelProviderBooking(booking);

    // Update booking status
    await this.bookingRepository.updateStatus(bookingId, BookingStatus.CANCELLED, {
      cancellationReason: dto.reason,
      cancelledAt: new Date(),
    });

    // Process refund if applicable
    if (dto.refundRequested && booking.cancellationPolicy?.refundable) {
      await this.processRefund(booking);
    }

    // Send cancellation notification
    await this.notificationService.sendBookingCancellation(booking);

    const cancelled = await this.bookingRepository.findById(bookingId);
    this.logger.log(`Booking cancelled successfully: ${bookingId}`);
    return this.toResponseDto(cancelled);
  }

  async getUserActiveBookings(userId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.findActiveBookings(userId);
    return bookings.map(this.toResponseDto);
  }

  async getUserUpcomingBookings(userId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.findUpcomingBookings(userId);
    return bookings.map(this.toResponseDto);
  }

  private async validateBookingLimits(userId: string): Promise<void> {
    const maxBookings = this.configService.get('booking.maxBookingsPerUser');
    const activeBookings = await this.bookingRepository.countActiveBookingsByUser(userId);
    
    if (activeBookings >= maxBookings) {
      throw new BadRequestException(`Maximum number of active bookings (${maxBookings}) reached`);
    }
  }

  private async validateBookingRequest(dto: CreateBookingDto): Promise<void> {
    // Validate itinerary timing
    const now = new Date();
    const startTime = new Date(dto.itinerary.startTime);
    const maxAdvanceDays = this.configService.get('booking.advanceBookingDays');
    const maxAdvanceTime = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000);

    if (startTime <= now) {
      throw new BadRequestException('Booking start time must be in the future');
    }

    if (startTime > maxAdvanceTime) {
      throw new BadRequestException(`Cannot book more than ${maxAdvanceDays} days in advance`);
    }

    // Validate passengers
    if (!dto.passengers || dto.passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    // Validate itinerary
    if (!dto.itinerary.legs || dto.itinerary.legs.length === 0) {
      throw new BadRequestException('Itinerary must have at least one leg');
    }
  }

  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private calculateValidityPeriod(startTime: Date): { validFrom: Date; validUntil: Date } {
    const validFrom = new Date(startTime);
    const expiryMinutes = this.configService.get('booking.expiryMinutes');
    const validUntil = new Date(startTime.getTime() + expiryMinutes * 60 * 1000);

    return { validFrom, validUntil };
  }

  private calculateFare(dto: CreateBookingDto): any {
    // Simple fare calculation - in production, this would integrate with fare engines
    const baseFare = 100; // Base fare in cents
    const passengerCount = dto.passengers.length;
    const legCount = dto.itinerary.legs.length;

    const amount = baseFare * passengerCount * legCount;
    
    return {
      amount,
      currency: 'JPY',
      breakdown: [
        {
          type: 'base_fare',
          description: 'Base fare',
          amount: baseFare,
          quantity: passengerCount * legCount,
        },
      ],
      discounts: [],
      totalAmount: amount,
    };
  }

  private async processProviderBooking(booking: any): Promise<void> {
    // Process booking with relevant providers
    for (const leg of booking.itinerary.legs) {
      if (leg.serviceProvider) {
        const provider = await this.providerRepository.findByProviderId(leg.serviceProvider);
        if (provider) {
          try {
            const providerBooking = await this.providerService.createBooking(provider, booking, leg);
            booking.providerBookingId = providerBooking.id;
            booking.providerName = provider.providerName;
          } catch (error) {
            this.logger.error(`Provider booking failed for ${provider.providerName}:`, error);
            // Handle provider booking failure
          }
        }
      }
    }
  }

  private async syncProviderBooking(booking: any): Promise<void> {
    if (booking.providerBookingId && booking.providerName) {
      const provider = await this.providerRepository.findByProviderId(booking.providerName);
      if (provider) {
        await this.providerService.updateBooking(provider, booking);
      }
    }
  }

  private async cancelProviderBooking(booking: any): Promise<void> {
    if (booking.providerBookingId && booking.providerName) {
      const provider = await this.providerRepository.findByProviderId(booking.providerName);
      if (provider) {
        await this.providerService.cancelBooking(provider, booking);
      }
    }
  }

  private async validateCancellation(booking: any): Promise<void> {
    if (!booking.cancellationPolicy?.refundable) {
      return; // No restrictions for non-refundable bookings
    }

    if (booking.cancellationPolicy.cancellationDeadline) {
      const deadline = new Date(booking.cancellationPolicy.cancellationDeadline);
      if (new Date() > deadline) {
        throw new BadRequestException('Cancellation deadline has passed');
      }
    }
  }

  private async processRefund(booking: any): Promise<void> {
    if (booking.paymentId) {
      // Integration with payment service for refund processing
      this.logger.log(`Processing refund for booking ${booking.id}, payment ${booking.paymentId}`);
    }
  }

  private toResponseDto(entity: any): BookingResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      tripId: entity.tripId,
      status: entity.status,
      bookingType: entity.bookingType,
      passengers: entity.passengers,
      itinerary: entity.itinerary,
      fare: entity.fare,
      paymentId: entity.paymentId,
      confirmationCode: entity.confirmationCode,
      qrCode: entity.qrCode,
      validFrom: entity.validFrom,
      validUntil: entity.validUntil,
      cancellationPolicy: entity.cancellationPolicy,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}