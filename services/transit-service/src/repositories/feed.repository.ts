import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedEntity } from '../entities/feed.entity';

@Injectable()
export class FeedRepository {
  constructor(
    @InjectRepository(FeedEntity)
    private readonly repository: Repository<FeedEntity>,
  ) {}

  async findAll(): Promise<FeedEntity[]> {
    return this.repository.find({
      order: { providerName: 'ASC' },
    });
  }

  async findActive(): Promise<FeedEntity[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { providerName: 'ASC' },
    });
  }

  async findById(id: string): Promise<FeedEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByFeedId(feedId: string): Promise<FeedEntity | null> {
    return this.repository.findOne({ where: { feedId } });
  }

  async findStaleFeeds(): Promise<FeedEntity[]> {
    const now = new Date();
    return this.repository
      .createQueryBuilder('feed')
      .where('feed.isActive = :isActive', { isActive: true })
      .andWhere('(feed.lastUpdated IS NULL OR feed.lastUpdated < :threshold)', {
        threshold: new Date(now.getTime() - 1000), // feeds that need update
      })
      .getMany();
  }

  async create(feed: Partial<FeedEntity>): Promise<FeedEntity> {
    const entity = this.repository.create(feed);
    return this.repository.save(entity);
  }

  async update(id: string, feed: Partial<FeedEntity>): Promise<FeedEntity> {
    await this.repository.update(id, feed);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Feed with ID ${id} not found`);
    }
    return updated;
  }

  async updateLastFetch(id: string, success: boolean, error?: string): Promise<void> {
    const updates: Partial<FeedEntity> = {
      lastFetchAttempt: new Date(),
    };

    if (success) {
      updates.lastUpdated = new Date();
      updates.lastFetchError = undefined;
    } else {
      updates.lastFetchError = error;
    }

    await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
