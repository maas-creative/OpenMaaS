import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StopEntity } from '../entities/stop.entity';

@Injectable()
export class StopRepository {
  constructor(
    @InjectRepository(StopEntity)
    private readonly repository: Repository<StopEntity>,
  ) {}

  async findAll(feedId?: string): Promise<StopEntity[]> {
    const query = this.repository.createQueryBuilder('stop');

    if (feedId) {
      query.where('stop.feedId = :feedId', { feedId });
    }

    return query.orderBy('stop.stopName', 'ASC').getMany();
  }

  async findById(stopId: string): Promise<StopEntity | null> {
    return this.repository.findOne({
      where: { stopId },
      relations: ['parent'],
    });
  }

  async findByIds(stopIds: string[]): Promise<StopEntity[]> {
    return this.repository
      .createQueryBuilder('stop')
      .where('stop.stopId IN (:...stopIds)', { stopIds })
      .getMany();
  }

  async findNearby(
    lat: number,
    lon: number,
    radiusMeters: number,
    limit: number = 20,
  ): Promise<StopEntity[]> {
    return this.repository
      .createQueryBuilder('stop')
      .select()
      .addSelect(
        `ST_Distance(
          stop.location::geography,
          ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
        )`,
        'distance',
      )
      .where(
        `ST_DWithin(
          stop.location::geography,
          ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
          :radius
        )`,
        { lat, lon, radius: radiusMeters },
      )
      .orderBy('distance', 'ASC')
      .limit(limit)
      .getMany();
  }

  async search(query: string, limit: number = 20): Promise<StopEntity[]> {
    return this.repository
      .createQueryBuilder('stop')
      .where('LOWER(stop.stopName) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orWhere('stop.stopCode = :code', { code: query })
      .orderBy('stop.stopName', 'ASC')
      .limit(limit)
      .getMany();
  }

  async create(stop: Partial<StopEntity>): Promise<StopEntity> {
    const { stopLat, stopLon, ...restStop } = stop;
    const entity = this.repository.create({
      ...restStop,
      stopLat,
      stopLon,
      location: stopLat && stopLon ? {
        type: 'Point' as const,
        coordinates: [stopLon, stopLat],
      } as any : undefined,
    });
    return this.repository.save(entity);
  }

  async upsert(stops: Partial<StopEntity>[]): Promise<void> {
    const entities = stops.map((stop) => {
      const { stopLat, stopLon, ...restStop } = stop;
      return {
        ...restStop,
        stopLat,
        stopLon,
        location: stopLat && stopLon ? {
          type: 'Point' as const,
          coordinates: [stopLon, stopLat],
        } as any : undefined,
      };
    });
    await this.repository.upsert(entities, ['stopId', 'feedId']);
  }

  async deleteByFeed(feedId: string): Promise<void> {
    await this.repository.delete({ feedId });
  }
}
