import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingProviderEntity } from '../entities/booking-provider.entity';

@Injectable()
export class BookingProviderRepository {
  constructor(
    @InjectRepository(BookingProviderEntity)
    private readonly repository: Repository<BookingProviderEntity>,
  ) {}

  async findAll(): Promise<BookingProviderEntity[]> {
    return this.repository.find({
      order: { providerName: 'ASC' },
    });
  }

  async findActive(): Promise<BookingProviderEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { providerName: 'ASC' },
    });
  }

  async findById(id: string): Promise<BookingProviderEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByProviderId(providerId: string): Promise<BookingProviderEntity | null> {
    return this.repository.findOne({ where: { providerId } });
  }

  async findByType(providerType: string): Promise<BookingProviderEntity[]> {
    return this.repository.find({
      where: { providerType, isActive: true },
      order: { providerName: 'ASC' },
    });
  }

  async findByMode(mode: string): Promise<BookingProviderEntity[]> {
    return this.repository
      .createQueryBuilder('provider')
      .where('provider.isActive = :isActive', { isActive: true })
      .andWhere('provider.supportedModes @> :mode', { mode: JSON.stringify([mode]) })
      .orderBy('provider.providerName', 'ASC')
      .getMany();
  }

  async create(provider: Partial<BookingProviderEntity>): Promise<BookingProviderEntity> {
    const entity = this.repository.create(provider);
    return this.repository.save(entity);
  }

  async update(id: string, provider: Partial<BookingProviderEntity>): Promise<BookingProviderEntity> {
    await this.repository.update(id, provider);
    return this.findById(id);
  }

  async updateSyncStatus(id: string, syncStatus: string, error?: string): Promise<void> {
    const updateData: Partial<BookingProviderEntity> = {
      lastSync: new Date(),
      syncStatus,
    };

    if (error) {
      updateData.lastError = error;
      updateData.errorCount = () => 'error_count + 1';
    } else {
      updateData.errorCount = 0;
      updateData.lastError = null;
    }

    await this.repository.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}