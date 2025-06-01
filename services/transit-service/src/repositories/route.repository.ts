import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteEntity } from '../entities/route.entity';
import { RouteType } from '@openmaas/types';

@Injectable()
export class RouteRepository {
  constructor(
    @InjectRepository(RouteEntity)
    private readonly repository: Repository<RouteEntity>,
  ) {}

  async findAll(feedId?: string): Promise<RouteEntity[]> {
    const query = this.repository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.agency', 'agency');

    if (feedId) {
      query.where('route.feedId = :feedId', { feedId });
    }

    return query
      .orderBy('route.routeSortOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('route.routeShortName', 'ASC')
      .addOrderBy('route.routeLongName', 'ASC')
      .getMany();
  }

  async findById(routeId: string): Promise<RouteEntity | null> {
    return this.repository.findOne({
      where: { routeId },
      relations: ['agency'],
    });
  }

  async findByAgency(agencyId: string): Promise<RouteEntity[]> {
    return this.repository.find({
      where: { agencyId },
      relations: ['agency'],
      order: {
        routeSortOrder: 'ASC',
        routeShortName: 'ASC',
        routeLongName: 'ASC',
      },
    });
  }

  async findByType(routeType: RouteType, feedId?: string): Promise<RouteEntity[]> {
    const query = this.repository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.agency', 'agency')
      .where('route.routeType = :routeType', { routeType });

    if (feedId) {
      query.andWhere('route.feedId = :feedId', { feedId });
    }

    return query
      .orderBy('route.routeSortOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('route.routeShortName', 'ASC')
      .getMany();
  }

  async search(query: string, limit: number = 20): Promise<RouteEntity[]> {
    return this.repository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.agency', 'agency')
      .where('LOWER(route.routeShortName) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orWhere('LOWER(route.routeLongName) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orderBy('route.routeSortOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('route.routeShortName', 'ASC')
      .limit(limit)
      .getMany();
  }

  async create(route: Partial<RouteEntity>): Promise<RouteEntity> {
    const entity = this.repository.create(route);
    return this.repository.save(entity);
  }

  async upsert(routes: Partial<RouteEntity>[]): Promise<void> {
    await this.repository.upsert(routes, ['routeId', 'feedId']);
  }

  async deleteByFeed(feedId: string): Promise<void> {
    await this.repository.delete({ feedId });
  }
}
