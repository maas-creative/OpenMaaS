import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TripHistoryRepository } from '../repositories/trip-history.repository';
import { UserService } from './user.service';
import { TripHistory } from '../entities/trip-history.entity';
import { CreateTripHistoryDto, UpdateTripFeedbackDto } from '../dto/trip-history.dto';
import { PaginationParams, PaginatedResponse } from '@openmaas/types';

@Injectable()
export class TripHistoryService {
  constructor(
    private readonly tripHistoryRepository: TripHistoryRepository,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, createTripDto: CreateTripHistoryDto): Promise<TripHistory> {
    // Verify user exists
    await this.userService.findById(userId);

    const tripHistory = new TripHistory();
    tripHistory.userId = userId;
    tripHistory.bookingId = createTripDto.bookingId;
    tripHistory.startTime = new Date(createTripDto.startTime);
    tripHistory.endTime = new Date(createTripDto.endTime);
    tripHistory.duration = createTripDto.duration;
    tripHistory.totalDistance = createTripDto.totalDistance;
    tripHistory.walkDistance = createTripDto.walkDistance;
    tripHistory.transfers = createTripDto.transfers;
    tripHistory.legs = createTripDto.legs;
    tripHistory.fare = createTripDto.fare;
    tripHistory.status = createTripDto.status || 'planned';
    tripHistory.metadata = createTripDto.metadata || {};

    return this.tripHistoryRepository.create(tripHistory);
  }

  async findById(id: string, userId?: string): Promise<TripHistory> {
    const trip = await this.tripHistoryRepository.findById(id);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // If userId is provided, verify ownership
    if (userId && trip.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return trip;
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
    // Verify user exists
    await this.userService.findById(userId);

    return this.tripHistoryRepository.findByUserId(userId, filters, pagination);
  }

  async updateStatus(
    id: string,
    userId: string,
    status: 'completed' | 'cancelled',
  ): Promise<TripHistory> {
    const trip = await this.findById(id, userId);

    if (trip.status !== 'planned') {
      throw new BadRequestException(`Cannot update trip with status: ${trip.status}`);
    }

    if (status === 'completed') {
      trip.markAsCompleted();
    } else {
      trip.markAsCancelled();
    }

    const updated = await this.tripHistoryRepository.update(id, { status: trip.status });
    if (!updated) {
      throw new BadRequestException('Failed to update trip status');
    }

    return updated;
  }

  async addFeedback(
    id: string,
    userId: string,
    feedbackDto: UpdateTripFeedbackDto,
  ): Promise<TripHistory> {
    const trip = await this.findById(id, userId);

    if (trip.status !== 'completed') {
      throw new BadRequestException('Can only add feedback to completed trips');
    }

    trip.addFeedback(feedbackDto.rating, feedbackDto.comment, feedbackDto.issues);

    const updated = await this.tripHistoryRepository.update(id, { feedback: trip.feedback });
    if (!updated) {
      throw new BadRequestException('Failed to add feedback');
    }

    return updated;
  }

  async getRecentTrips(userId: string, limit: number = 5): Promise<TripHistory[]> {
    // Verify user exists
    await this.userService.findById(userId);

    return this.tripHistoryRepository.getRecentTrips(userId, limit);
  }

  async getFrequentRoutes(
    userId: string,
    limit: number = 5,
  ): Promise<Array<{ origin: string; destination: string; count: number }>> {
    // Verify user exists
    await this.userService.findById(userId);

    return this.tripHistoryRepository.getFrequentRoutes(userId, limit);
  }

  async getTripStats(
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
    // Verify user exists
    await this.userService.findById(userId);

    return this.tripHistoryRepository.getTripStatsByDateRange(userId, startDate, endDate);
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
    // Verify user exists
    await this.userService.findById(userId);

    if (month < 1 || month > 12) {
      throw new BadRequestException('Invalid month');
    }

    return this.tripHistoryRepository.getMonthlyStats(userId, year, month);
  }

  async delete(id: string, userId: string): Promise<void> {
    const trip = await this.findById(id, userId);

    const deleted = await this.tripHistoryRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException('Failed to delete trip');
    }
  }
}
