import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TripHistory } from '../entities/trip-history.entity';
import { PaginationParams, PaginatedResponse } from '@openmaas/types';

@Injectable()
export class TripHistoryRepository {
  constructor(
    @InjectRepository(TripHistory)
    private readonly repository: Repository<TripHistory>,
  ) {}

  async create(trip: Partial<TripHistory>): Promise<TripHistory> {
    const entity = this.repository.create(trip);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<TripHistory | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async findByUserId(
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      mode?: string;
    },
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<TripHistory>> {
    const { page = 1, limit = 20, sortBy = 'startTime', sortOrder = 'desc' } = pagination;

    const query = this.repository
      .createQueryBuilder('trip')
      .where('trip.userId = :userId', { userId });

    // Apply filters
    if (filters.startDate && filters.endDate) {
      query.andWhere('trip.startTime BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      query.andWhere('trip.startTime >= :startDate', { startDate: filters.startDate });
    } else if (filters.endDate) {
      query.andWhere('trip.startTime <= :endDate', { endDate: filters.endDate });
    }

    if (filters.status) {
      query.andWhere('trip.status = :status', { status: filters.status });
    }

    if (filters.mode) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM jsonb_array_elements(trip.legs) AS leg
          WHERE leg->>'mode' = :mode
        )`,
        { mode: filters.mode },
      );
    }

    // Apply sorting
    query.orderBy(`trip.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Execute query
    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    };
  }

  async update(id: string, updates: Partial<TripHistory>): Promise<TripHistory | null> {
    await this.repository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async getRecentTrips(userId: string, limit: number = 5): Promise<TripHistory[]> {
    return this.repository.find({
      where: { userId },
      order: { startTime: 'DESC' },
      take: limit,
    });
  }

  async getFrequentRoutes(
    userId: string,
    limit: number = 5,
  ): Promise<Array<{ origin: string; destination: string; count: number }>> {
    const result = await this.repository
      .createQueryBuilder('trip')
      .select(
        `trip.legs->0->>'from' AS origin, 
         trip.legs->-1->>'to' AS destination,
         COUNT(*) AS count`,
      )
      .where('trip.userId = :userId', { userId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .groupBy('origin, destination')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map((row) => ({
      origin: JSON.parse(row.origin).name,
      destination: JSON.parse(row.destination).name,
      count: parseInt(row.count),
    }));
  }

  async getTripStatsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalTrips: number;
    totalDistance: number;
    totalDuration: number;
    averageDistance: number;
    averageDuration: number;
    modeDistribution: Record<string, number>;
  }> {
    const trips = await this.repository.find({
      where: {
        userId,
        startTime: Between(startDate, endDate),
        status: 'completed',
      },
    });

    if (trips.length === 0) {
      return {
        totalTrips: 0,
        totalDistance: 0,
        totalDuration: 0,
        averageDistance: 0,
        averageDuration: 0,
        modeDistribution: {},
      };
    }

    let totalDistance = 0;
    let totalDuration = 0;
    const modeDistribution: Record<string, number> = {};

    trips.forEach((trip) => {
      totalDistance += trip.totalDistance;
      totalDuration += trip.duration;

      trip.legs.forEach((leg) => {
        modeDistribution[leg.mode] = (modeDistribution[leg.mode] || 0) + 1;
      });
    });

    return {
      totalTrips: trips.length,
      totalDistance,
      totalDuration,
      averageDistance: Math.round(totalDistance / trips.length),
      averageDuration: Math.round(totalDuration / trips.length),
      modeDistribution,
    };
  }

  async getMonthlyStats(
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    days: Array<{
      date: string;
      trips: number;
      distance: number;
    }>;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const result = await this.repository
      .createQueryBuilder('trip')
      .select('DATE(trip.startTime)', 'date')
      .addSelect('COUNT(*)', 'trips')
      .addSelect('SUM(trip.totalDistance)', 'distance')
      .where('trip.userId = :userId', { userId })
      .andWhere('trip.startTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('trip.status = :status', { status: 'completed' })
      .groupBy('DATE(trip.startTime)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      days: result.map((row) => ({
        date: row.date,
        trips: parseInt(row.trips),
        distance: parseInt(row.distance) || 0,
      })),
    };
  }
}