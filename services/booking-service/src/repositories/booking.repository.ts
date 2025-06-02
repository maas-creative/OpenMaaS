import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingStatus } from '@openmaas/types';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly repository: Repository<BookingEntity>,
  ) {}

  async findAll(
    userId?: string,
    status?: BookingStatus,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ bookings: BookingEntity[]; total: number }> {
    const query = this.repository.createQueryBuilder('booking');

    if (userId) {
      query.andWhere('booking.userId = :userId', { userId });
    }

    if (status) {
      query.andWhere('booking.status = :status', { status });
    }

    if (fromDate || toDate) {
      if (fromDate && toDate) {
        query.andWhere('booking.createdAt BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      } else if (fromDate) {
        query.andWhere('booking.createdAt >= :fromDate', { fromDate });
      } else if (toDate) {
        query.andWhere('booking.createdAt <= :toDate', { toDate });
      }
    }

    const [bookings, total] = await query
      .orderBy('booking.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { bookings, total };
  }

  async findById(id: string): Promise<BookingEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByConfirmationCode(confirmationCode: string): Promise<BookingEntity | null> {
    return this.repository.findOne({ where: { confirmationCode } });
  }

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<BookingEntity[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findActiveBookings(userId: string): Promise<BookingEntity[]> {
    return this.repository.find({
      where: {
        userId,
        status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
      },
      order: { validFrom: 'ASC' },
    });
  }

  async findUpcomingBookings(userId: string): Promise<BookingEntity[]> {
    const now = new Date();
    return this.repository.find({
      where: {
        userId,
        status: BookingStatus.CONFIRMED,
        validFrom: Between(now, new Date(now.getTime() + 24 * 60 * 60 * 1000)), // Next 24 hours
      },
      order: { validFrom: 'ASC' },
    });
  }

  async findExpiredBookings(): Promise<BookingEntity[]> {
    const now = new Date();
    return this.repository.find({
      where: {
        status: BookingStatus.PENDING,
        validUntil: Between(new Date(0), now), // Past expiry time
      },
    });
  }

  async countActiveBookingsByUser(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
      },
    });
  }

  async create(booking: Partial<BookingEntity>): Promise<BookingEntity> {
    const entity = this.repository.create(booking);
    return this.repository.save(entity);
  }

  async update(id: string, booking: Partial<BookingEntity>): Promise<BookingEntity> {
    await this.repository.update(id, booking);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Booking with id ${id} not found`);
    }
    return updated;
  }

  async updateStatus(
    id: string,
    status: BookingStatus,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const updateData: Partial<BookingEntity> = { status };

    if (status === BookingStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    await this.repository.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async bulkUpdateExpiredBookings(): Promise<void> {
    const now = new Date();
    await this.repository
      .createQueryBuilder()
      .update(BookingEntity)
      .set({ status: BookingStatus.EXPIRED })
      .where('status = :pendingStatus', { pendingStatus: BookingStatus.PENDING })
      .andWhere('validUntil < :now', { now })
      .execute();
  }
}
