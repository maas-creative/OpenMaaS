import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethodEntity } from '../entities/payment-method.entity';

@Injectable()
export class PaymentMethodRepository {
  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly repository: Repository<PaymentMethodEntity>,
  ) {}

  async findAll(userId: string): Promise<PaymentMethodEntity[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<PaymentMethodEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserAndId(userId: string, id: string): Promise<PaymentMethodEntity | null> {
    return this.repository.findOne({ 
      where: { id, userId, isActive: true } 
    });
  }

  async findByStripePaymentMethodId(stripePaymentMethodId: string): Promise<PaymentMethodEntity | null> {
    return this.repository.findOne({ 
      where: { stripePaymentMethodId } 
    });
  }

  async findDefaultByUser(userId: string): Promise<PaymentMethodEntity | null> {
    return this.repository.findOne({ 
      where: { userId, isDefault: true, isActive: true } 
    });
  }

  async create(paymentMethod: Partial<PaymentMethodEntity>): Promise<PaymentMethodEntity> {
    const entity = this.repository.create(paymentMethod);
    return this.repository.save(entity);
  }

  async update(id: string, paymentMethod: Partial<PaymentMethodEntity>): Promise<PaymentMethodEntity> {
    await this.repository.update(id, paymentMethod);
    return this.findById(id);
  }

  async setAsDefault(userId: string, id: string): Promise<void> {
    // First, unset any existing default
    await this.repository.update(
      { userId, isDefault: true },
      { isDefault: false }
    );

    // Then set the new default
    await this.repository.update(
      { id, userId },
      { isDefault: true }
    );
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }

  async deleteByUser(userId: string, id: string): Promise<void> {
    await this.repository.update(
      { id, userId },
      { isActive: false }
    );
  }
}