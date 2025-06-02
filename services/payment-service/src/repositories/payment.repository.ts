import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentStatus } from '@openmaas/types';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repository: Repository<PaymentEntity>,
  ) {}

  async findAll(
    userId: string,
    bookingId?: string,
    status?: PaymentStatus,
    fromDate?: Date,
    toDate?: Date,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ payments: PaymentEntity[]; total: number }> {
    const query = this.repository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.refunds', 'refunds')
      .where('payment.userId = :userId', { userId });

    if (bookingId) {
      query.andWhere('payment.bookingId = :bookingId', { bookingId });
    }

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    if (fromDate || toDate) {
      if (fromDate && toDate) {
        query.andWhere('payment.createdAt BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      } else if (fromDate) {
        query.andWhere('payment.createdAt >= :fromDate', { fromDate });
      } else if (toDate) {
        query.andWhere('payment.createdAt <= :toDate', { toDate });
      }
    }

    const [payments, total] = await query
      .orderBy('payment.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return { payments, total };
  }

  async findById(id: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['refunds'],
    });
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      where: { idempotencyKey },
      relations: ['refunds'],
    });
  }

  async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<PaymentEntity | null> {
    return this.repository.findOne({
      where: { stripePaymentIntentId },
      relations: ['refunds'],
    });
  }

  async findByBookingId(bookingId: string): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: { bookingId },
      relations: ['refunds'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingPayments(userId: string): Promise<PaymentEntity[]> {
    return this.repository.find({
      where: {
        userId,
        status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTotalAmountByUser(userId: string, status?: PaymentStatus): Promise<number> {
    const query = this.repository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.userId = :userId', { userId });

    if (status) {
      query.andWhere('payment.status = :status', { status });
    }

    const result = await query.getRawOne();
    return parseFloat(result?.total || '0');
  }

  async create(payment: Partial<PaymentEntity>): Promise<PaymentEntity> {
    const entity = this.repository.create(payment);
    return this.repository.save(entity);
  }

  async update(id: string, payment: Partial<PaymentEntity>): Promise<PaymentEntity> {
    await this.repository.update(id, payment);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Payment with id ${id} not found`);
    }
    return updated;
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    metadata?: Partial<PaymentEntity>,
  ): Promise<void> {
    const updateData: Partial<PaymentEntity> = {
      status,
      ...metadata,
    };

    if (status === PaymentStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.repository.update(id, updateData);
  }

  async incrementRefundedAmount(id: string, amount: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(PaymentEntity)
      .set({
        refundedAmount: () => `refunded_amount + ${amount}`,
      })
      .where('id = :id', { id })
      .execute();
  }
}
