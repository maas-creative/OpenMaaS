import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { User } from '../entities/user.entity';
import { PaginationParams, PaginatedResponse } from '@openmaas/types';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    const entity = this.repository.create(user);
    return this.repository.save(entity);
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByExternalId(externalId: string): Promise<User | null> {
    return this.repository.findOne({ where: { externalId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.repository.findOne({ where: { phone } });
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async exists(where: FindOptionsWhere<User>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async findAll(
    filters: {
      search?: string;
      role?: string;
      isActive?: boolean;
    },
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

    const query = this.repository.createQueryBuilder('user');

    // Apply filters
    if (filters.search) {
      query.andWhere(
        '(user.email ILIKE :search OR user.profile->>\'firstName\' ILIKE :search OR user.profile->>\'lastName\' ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.role) {
      query.andWhere(':role = ANY(user.roles)', { role: filters.role });
    }

    // Apply sorting
    const sortField = this.getSortField(sortBy);
    query.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

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

  async findByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.repository.findByIds(ids);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update(userId, {
      metadata: () => `
        COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object('lastLoginAt', to_json(CURRENT_TIMESTAMP)::jsonb)
      `,
    } as any);
  }

  async getUserStats(userId: string): Promise<{
    totalTrips: number;
    totalDistance: number;
    totalDuration: number;
    preferredMode: string;
  }> {
    const result = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user.tripHistory', 'trip')
      .select('COUNT(trip.id)', 'totalTrips')
      .addSelect('COALESCE(SUM(trip.totalDistance), 0)', 'totalDistance')
      .addSelect('COALESCE(SUM(trip.duration), 0)', 'totalDuration')
      .where('user.id = :userId', { userId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .getRawOne();

    // Get preferred mode
    const modeResult = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user.tripHistory', 'trip')
      .select('trip.legs')
      .where('user.id = :userId', { userId })
      .andWhere('trip.status = :status', { status: 'completed' })
      .getMany();

    // Calculate preferred mode from trip legs
    const modeCounts: Record<string, number> = {};
    // Implementation would process trip legs to find most used mode

    return {
      totalTrips: parseInt(result.totalTrips) || 0,
      totalDistance: parseInt(result.totalDistance) || 0,
      totalDuration: parseInt(result.totalDuration) || 0,
      preferredMode: 'BUS', // Default, would be calculated from modeCounts
    };
  }

  private getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      createdAt: 'user.createdAt',
      updatedAt: 'user.updatedAt',
      email: 'user.email',
      name: 'user.profile->>\'firstName\'',
    };
    return fieldMap[sortBy] || 'user.createdAt';
  }
}