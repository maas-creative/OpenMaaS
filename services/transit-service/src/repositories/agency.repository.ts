import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyEntity } from '../entities/agency.entity';

@Injectable()
export class AgencyRepository {
  constructor(
    @InjectRepository(AgencyEntity)
    private readonly repository: Repository<AgencyEntity>,
  ) {}

  async findAll(feedId?: string): Promise<AgencyEntity[]> {
    const query = this.repository.createQueryBuilder('agency');

    if (feedId) {
      query.where('agency.feedId = :feedId', { feedId });
    }

    return query.orderBy('agency.agencyName', 'ASC').getMany();
  }

  async findById(agencyId: string): Promise<AgencyEntity | null> {
    return this.repository.findOne({ where: { agencyId } });
  }

  async findByFeed(feedId: string): Promise<AgencyEntity[]> {
    return this.repository.find({
      where: { feedId },
      order: { agencyName: 'ASC' },
    });
  }

  async create(agency: Partial<AgencyEntity>): Promise<AgencyEntity> {
    const entity = this.repository.create(agency);
    return this.repository.save(entity);
  }

  async update(agencyId: string, agency: Partial<AgencyEntity>): Promise<AgencyEntity> {
    await this.repository.update({ agencyId }, agency);
    const updated = await this.findById(agencyId);
    if (!updated) {
      throw new Error(`Agency with ID ${agencyId} not found`);
    }
    return updated;
  }

  async upsert(agencies: Partial<AgencyEntity>[]): Promise<void> {
    await this.repository.upsert(agencies, ['agencyId', 'feedId']);
  }

  async deleteByFeed(feedId: string): Promise<void> {
    await this.repository.delete({ feedId });
  }
}
