import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { FeedService } from '../services/feed.service';
import { CreateFeedDto, UpdateFeedDto, FeedResponseDto } from '../dto/feed.dto';

@ApiTags('transit-feeds')
@Controller('transit/feeds')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Get all GTFS feeds' })
  @ApiResponse({
    status: 200,
    description: 'List of GTFS feeds',
    type: [FeedResponseDto],
  })
  async getFeeds(): Promise<FeedResponseDto[]> {
    return this.feedService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific GTFS feed' })
  @ApiResponse({
    status: 200,
    description: 'GTFS feed details',
    type: FeedResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feed not found' })
  async getFeed(@Param('id') id: string): Promise<FeedResponseDto> {
    return this.feedService.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new GTFS feed' })
  @ApiResponse({
    status: 201,
    description: 'Feed created successfully',
    type: FeedResponseDto,
  })
  async createFeed(@Body() dto: CreateFeedDto): Promise<FeedResponseDto> {
    return this.feedService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a GTFS feed' })
  @ApiResponse({
    status: 200,
    description: 'Feed updated successfully',
    type: FeedResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feed not found' })
  async updateFeed(@Param('id') id: string, @Body() dto: UpdateFeedDto): Promise<FeedResponseDto> {
    return this.feedService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a GTFS feed' })
  @ApiResponse({ status: 204, description: 'Feed deleted successfully' })
  @ApiResponse({ status: 404, description: 'Feed not found' })
  async deleteFeed(@Param('id') id: string): Promise<void> {
    return this.feedService.delete(id);
  }

  @Post(':id/update')
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger manual update of a GTFS feed' })
  @ApiResponse({ status: 202, description: 'Feed update started' })
  @ApiResponse({ status: 404, description: 'Feed not found' })
  async updateFeed(@Param('id') id: string): Promise<void> {
    await this.feedService.updateFeed(id);
  }
}
