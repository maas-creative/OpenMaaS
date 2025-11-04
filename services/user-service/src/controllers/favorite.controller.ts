import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AuthContext, Favorite } from '@openmaas/types';
import { FavoriteService } from '../services/favorite.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateFavoriteDto, UpdateFavoriteDto } from '../dto/favorite.dto';

@ApiTags('Favorites')
@Controller('users/me/favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a favorite location or route' })
  @ApiResponse({
    status: 201,
    description: 'Favorite successfully created',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createFavorite(
    @Request() req: ExpressRequest & { user: AuthContext },
    @Body() createFavoriteDto: CreateFavoriteDto,
  ): Promise<Favorite> {
    const userId = req.user.userId;
    return this.favoriteService.addFavorite(userId, createFavoriteDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all favorites' })
  @ApiResponse({
    status: 200,
    description: 'List of favorites',
    schema: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  })
  async getFavorites(@Request() req: ExpressRequest & { user: AuthContext }): Promise<Favorite[]> {
    const userId = req.user.userId;
    return this.favoriteService.getFavorites(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific favorite by ID' })
  @ApiResponse({
    status: 200,
    description: 'Favorite details',
  })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async getFavorite(
    @Request() req: ExpressRequest & { user: AuthContext },
    @Param('id') favoriteId: string,
  ): Promise<Favorite> {
    const userId = req.user.userId;
    return this.favoriteService.getFavorite(userId, favoriteId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a favorite' })
  @ApiResponse({
    status: 200,
    description: 'Favorite successfully updated',
  })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async updateFavorite(
    @Request() req: ExpressRequest & { user: AuthContext },
    @Param('id') favoriteId: string,
    @Body() updateFavoriteDto: UpdateFavoriteDto,
  ): Promise<Favorite> {
    const userId = req.user.userId;
    return this.favoriteService.updateFavorite(userId, favoriteId, updateFavoriteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a favorite' })
  @ApiResponse({
    status: 204,
    description: 'Favorite successfully deleted',
  })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async deleteFavorite(
    @Request() req: ExpressRequest & { user: AuthContext },
    @Param('id') favoriteId: string,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.favoriteService.deleteFavorite(userId, favoriteId);
  }
}
