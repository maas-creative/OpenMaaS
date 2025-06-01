import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AuthContext } from '@openmaas/types';
import { UserService } from '../services/user.service';
import { TripHistoryService } from '../services/trip-history.service';
import { UserPreferencesService } from '../services/user-preferences.service';
import { CreateUserDto, UpdateUserDto, UpdateUserRolesDto, UserQueryDto } from '../dto/user.dto';
import {
  CreateTripHistoryDto,
  UpdateTripFeedbackDto,
  TripHistoryQueryDto,
  TripStatsQueryDto,
  MonthlyStatsQueryDto,
} from '../dto/trip-history.dto';
import { UpdatePreferencesDto } from '../dto/user-preferences.dto';
import { User } from '../entities/user.entity';
import { TripHistory } from '../entities/trip-history.entity';
import { PaginatedResponse, UserPreferences } from '@openmaas/types';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly tripHistoryService: TripHistoryService,
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: User })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() query: UserQueryDto): Promise<PaginatedResponse<User>> {
    const { search, role, page, limit, sortBy, sortOrder } = query;
    return this.userService.findAll({ search, role }, { page, limit, sortBy, sortOrder });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: User })
  async getProfile(@Request() req: ExpressRequest & { user: AuthContext }): Promise<User> {
    return this.userService.findByExternalId(req.user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully', type: User })
  async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.userService.update(user.id, updateUserDto);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences retrieved successfully' })
  async getMyPreferences(@Request() req: any): Promise<UserPreferences> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.userPreferencesService.getPreferences(user.id);
  }

  @Put('me/preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences updated successfully' })
  async updateMyPreferences(
    @Request() req: any,
    @Body() updateDto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.userPreferencesService.updatePreferences(user.id, updateDto);
  }

  @Get('me/trips')
  @ApiOperation({ summary: 'Get current user trip history' })
  @ApiResponse({ status: 200, description: 'Trip history retrieved successfully' })
  async getMyTrips(
    @Request() req: any,
    @Query() query: TripHistoryQueryDto,
  ): Promise<PaginatedResponse<TripHistory>> {
    const user = await this.userService.findByExternalId(req.user.sub);
    const { startDate, endDate, status, mode, page, limit, sortBy, sortOrder } = query;
    return this.tripHistoryService.findByUserId(
      user.id,
      { startDate, endDate, status, mode },
      { page, limit, sortBy, sortOrder },
    );
  }

  @Post('me/trips')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trip for current user' })
  @ApiResponse({ status: 201, description: 'Trip created successfully', type: TripHistory })
  async createMyTrip(
    @Request() req: any,
    @Body() createTripDto: CreateTripHistoryDto,
  ): Promise<TripHistory> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.create(user.id, createTripDto);
  }

  @Get('me/trips/recent')
  @ApiOperation({ summary: 'Get recent trips for current user' })
  @ApiResponse({ status: 200, description: 'Recent trips retrieved successfully' })
  async getMyRecentTrips(
    @Request() req: any,
    @Query('limit') limit: number = 5,
  ): Promise<TripHistory[]> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.getRecentTrips(user.id, limit);
  }

  @Get('me/trips/frequent-routes')
  @ApiOperation({ summary: 'Get frequent routes for current user' })
  @ApiResponse({ status: 200, description: 'Frequent routes retrieved successfully' })
  async getMyFrequentRoutes(
    @Request() req: any,
    @Query('limit') limit: number = 5,
  ): Promise<Array<{ origin: string; destination: string; count: number }>> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.getFrequentRoutes(user.id, limit);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get statistics for current user' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getMyStats(@Request() req: any) {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.userService.getUserStats(user.id);
  }

  @Get('me/trips/stats')
  @ApiOperation({ summary: 'Get trip statistics for current user' })
  @ApiResponse({ status: 200, description: 'Trip statistics retrieved successfully' })
  async getMyTripStats(@Request() req: any, @Query() query: TripStatsQueryDto) {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.getTripStats(
      user.id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('me/trips/monthly-stats')
  @ApiOperation({ summary: 'Get monthly trip statistics for current user' })
  @ApiResponse({ status: 200, description: 'Monthly statistics retrieved successfully' })
  async getMyMonthlyStats(@Request() req: any, @Query() query: MonthlyStatsQueryDto) {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.getMonthlyStats(user.id, query.year, query.month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.userService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.userService.delete(id);
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Update user roles' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User roles updated successfully', type: User })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRolesDto: UpdateUserRolesDto,
  ): Promise<User> {
    return this.userService.updateRoles(id, updateRolesDto.roles);
  }

  @Get(':id/trips')
  @ApiOperation({ summary: 'Get trip history for specific user' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Trip history retrieved successfully' })
  async getUserTrips(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TripHistoryQueryDto,
  ): Promise<PaginatedResponse<TripHistory>> {
    const { startDate, endDate, status, mode, page, limit, sortBy, sortOrder } = query;
    return this.tripHistoryService.findByUserId(
      id,
      { startDate, endDate, status, mode },
      { page, limit, sortBy, sortOrder },
    );
  }

  @Put('trips/:tripId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark trip as completed' })
  @ApiParam({ name: 'tripId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Trip marked as completed', type: TripHistory })
  async completeTrip(
    @Request() req: any,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ): Promise<TripHistory> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.updateStatus(tripId, user.id, 'completed');
  }

  @Put('trips/:tripId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel trip' })
  @ApiParam({ name: 'tripId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Trip cancelled', type: TripHistory })
  async cancelTrip(
    @Request() req: any,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ): Promise<TripHistory> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.updateStatus(tripId, user.id, 'cancelled');
  }

  @Put('trips/:tripId/feedback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add feedback to completed trip' })
  @ApiParam({ name: 'tripId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Feedback added successfully', type: TripHistory })
  async addTripFeedback(
    @Request() req: any,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() feedbackDto: UpdateTripFeedbackDto,
  ): Promise<TripHistory> {
    const user = await this.userService.findByExternalId(req.user.sub);
    return this.tripHistoryService.addFeedback(tripId, user.id, feedbackDto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return {
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
    };
  }
}
