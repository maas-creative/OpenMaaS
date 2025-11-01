import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { Favorite } from '@openmaas/types';

@Injectable()
export class FavoriteService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Add a favorite location or route for a user
   */
  async addFavorite(userId: string, favorite: Omit<Favorite, 'id' | 'createdAt' | 'updatedAt'>): Promise<Favorite> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const favorites = user.favorites || [];
    const newFavorite: Favorite = {
      ...favorite,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    favorites.push(newFavorite);

    await this.userRepository.update(userId, { favorites });

    return newFavorite;
  }

  /**
   * Get all favorites for a user
   */
  async getFavorites(userId: string): Promise<Favorite[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.favorites || [];
  }

  /**
   * Get a specific favorite by ID
   */
  async getFavorite(userId: string, favoriteId: string): Promise<Favorite> {
    const favorites = await this.getFavorites(userId);
    const favorite = favorites.find((f) => f.id === favoriteId);

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return favorite;
  }

  /**
   * Update a favorite
   */
  async updateFavorite(
    userId: string,
    favoriteId: string,
    updates: Partial<Omit<Favorite, 'id' | 'createdAt'>>,
  ): Promise<Favorite> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const favorites = user.favorites || [];
    const index = favorites.findIndex((f) => f.id === favoriteId);

    if (index === -1) {
      throw new NotFoundException('Favorite not found');
    }

    favorites[index] = {
      ...favorites[index],
      ...updates,
      updatedAt: new Date(),
    };

    await this.userRepository.update(userId, { favorites });

    return favorites[index];
  }

  /**
   * Delete a favorite
   */
  async deleteFavorite(userId: string, favoriteId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const favorites = user.favorites || [];
    const filtered = favorites.filter((f) => f.id !== favoriteId);

    if (favorites.length === filtered.length) {
      throw new NotFoundException('Favorite not found');
    }

    await this.userRepository.update(userId, { favorites: filtered });
  }

  /**
   * Generate a unique ID for favorites
   */
  private generateId(): string {
    return `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
