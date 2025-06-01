import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeedRepository } from '../repositories/feed.repository';
import { GtfsService } from './gtfs.service';
import { CreateFeedDto, UpdateFeedDto, FeedResponseDto } from '../dto/feed.dto';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);
  private isUpdating = false;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly gtfsService: GtfsService,
  ) {}

  async findAll(): Promise<FeedResponseDto[]> {
    const feeds = await this.feedRepository.findAll();
    return feeds.map(this.toResponseDto);
  }

  async findById(id: string): Promise<FeedResponseDto> {
    const feed = await this.feedRepository.findById(id);
    if (!feed) {
      throw new NotFoundException(`Feed with ID ${id} not found`);
    }
    return this.toResponseDto(feed);
  }

  async create(dto: CreateFeedDto): Promise<FeedResponseDto> {
    const feed = await this.feedRepository.create({
      ...dto,
      feedType: dto.feedType || 'gtfs',
      isActive: dto.isActive ?? true,
      updateFrequency: dto.updateFrequency || 86400,
    });

    // Trigger initial fetch
    this.updateFeed(feed.id).catch((error) => {
      this.logger.error(`Failed to fetch feed ${feed.id} after creation:`, error);
    });

    return this.toResponseDto(feed);
  }

  async update(id: string, dto: UpdateFeedDto): Promise<FeedResponseDto> {
    const existing = await this.feedRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Feed with ID ${id} not found`);
    }

    const updated = await this.feedRepository.update(id, dto);
    return this.toResponseDto(updated);
  }

  async delete(id: string): Promise<void> {
    const feed = await this.feedRepository.findById(id);
    if (!feed) {
      throw new NotFoundException(`Feed with ID ${id} not found`);
    }

    // Clean up GTFS data
    await this.gtfsService.cleanupFeedData(feed.feedId);

    // Delete feed record
    await this.feedRepository.delete(id);
  }

  async updateFeed(id: string): Promise<void> {
    const feed = await this.feedRepository.findById(id);
    if (!feed || !feed.isActive) {
      return;
    }

    try {
      this.logger.log(`Starting update for feed: ${feed.feedId}`);
      await this.gtfsService.downloadAndProcessFeed(feed);
      await this.feedRepository.updateLastFetch(id, true);
      this.logger.log(`Successfully updated feed: ${feed.feedId}`);
    } catch (error) {
      this.logger.error(`Failed to update feed ${feed.feedId}:`, error);
      await this.feedRepository.updateLastFetch(id, false, error.message);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateStaleFeeds(): Promise<void> {
    if (this.isUpdating) {
      this.logger.warn('Feed update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    try {
      const staleFeeds = await this.feedRepository.findStaleFeeds();

      if (staleFeeds.length === 0) {
        return;
      }

      this.logger.log(`Found ${staleFeeds.length} stale feeds to update`);

      for (const feed of staleFeeds) {
        const now = new Date();
        const lastUpdate = feed.lastUpdated?.getTime() || 0;
        const timeSinceUpdate = now.getTime() - lastUpdate;

        if (timeSinceUpdate >= feed.updateFrequency * 1000) {
          await this.updateFeed(feed.id);
        }
      }
    } catch (error) {
      this.logger.error('Error updating stale feeds:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  private toResponseDto(entity: any): FeedResponseDto {
    return {
      id: entity.id,
      feedId: entity.feedId,
      providerId: entity.providerId,
      providerName: entity.providerName,
      feedUrl: entity.feedUrl,
      feedType: entity.feedType,
      isActive: entity.isActive,
      lastUpdated: entity.lastUpdated,
      lastFetchAttempt: entity.lastFetchAttempt,
      lastFetchError: entity.lastFetchError,
      updateFrequency: entity.updateFrequency,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
