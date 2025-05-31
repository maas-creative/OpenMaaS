import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundEntity } from '../entities/refund.entity';
import { RefundStatus } from '@openmaas/types';

@Injectable()
export class RefundRepository {
  constructor(
    @InjectRepository(RefundEntity)
    private readonly repository: Repository<RefundEntity>,
  ) {}

  async findById(id: string): Promise<RefundEntity | null> {
    return this.repository.findOne({ 
      where: { id },
      relations: ['payment'] 
    });
  }

  async findByPaymentId(paymentId: string): Promise<RefundEntity[]> {
    return this.repository.find({
      where: { paymentId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByStripeRefundId(stripeRefundId: string): Promise<RefundEntity | null> {
    return this.repository.findOne({ 
      where: { stripeRefundId },
      relations: ['payment']
    });
  }

  async getTotalRefundedAmount(paymentId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('refund')
      .select('SUM(refund.amount)', 'total')
      .where('refund.paymentId = :paymentId', { paymentId })
      .andWhere('refund.status = :status', { status: RefundStatus.COMPLETED })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  async create(refund: Partial<RefundEntity>): Promise<RefundEntity> {
    const entity = this.repository.create(refund);
    return this.repository.save(entity);
  }

  async update(id: string, refund: Partial<RefundEntity>): Promise<RefundEntity> {
    await this.repository.update(id, refund);
    return this.findById(id);
  }

  async updateStatus(
    id: string, 
    status: RefundStatus, 
    metadata?: Partial<RefundEntity>
  ): Promise<void> {
    const updateData: Partial<RefundEntity> = { 
      status,
      ...metadata 
    };

    if (status === RefundStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    await this.repository.update(id, updateData);
  }
}