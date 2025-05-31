import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';
import { User } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import {
  User as UserType,
  CreateUserDto as CreateUserType,
  UpdateUserDto as UpdateUserType,
  UserRole,
  PaginationParams,
  PaginatedResponse,
} from '@openmaas/types';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByExternalId(createUserDto.externalId);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Check if email is already in use
    const emailInUse = await this.userRepository.findByEmail(createUserDto.email);
    if (emailInUse) {
      throw new ConflictException('Email already in use');
    }

    // Create default preferences if not provided
    const defaultPreferences = {
      language: 'ja',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      notifications: {
        email: true,
        push: true,
        sms: false,
        tripReminders: true,
        serviceAlerts: true,
        promotions: false,
      },
    };

    const user = new User();
    user.externalId = createUserDto.externalId;
    user.email = createUserDto.email;
    user.phone = createUserDto.phone;
    user.roles = [UserRole.USER];
    user.profile = createUserDto.profile || {};
    user.preferences = {
      ...defaultPreferences,
      ...createUserDto.preferences,
    };

    return this.userRepository.create(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByExternalId(externalId: string): Promise<User> {
    const user = await this.userRepository.findByExternalId(externalId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Check if email is being changed and if it's already in use
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailInUse = await this.userRepository.findByEmail(updateUserDto.email);
      if (emailInUse) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update user fields
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
    if (updateUserDto.profile) {
      user.updateProfile(updateUserDto.profile);
    }
    if (updateUserDto.preferences) {
      user.updatePreferences(updateUserDto.preferences);
    }
    if (updateUserDto.metadata) {
      Object.entries(updateUserDto.metadata).forEach(([key, value]) => {
        user.updateMetadata(key, value);
      });
    }

    const updatedUser = await this.userRepository.update(id, user);
    if (!updatedUser) {
      throw new NotFoundException('Failed to update user');
    }

    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    const deleted = await this.userRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException('Failed to delete user');
    }
  }

  async findAll(
    filters: {
      search?: string;
      role?: string;
      isActive?: boolean;
    },
    pagination: PaginationParams,
  ): Promise<PaginatedResponse<User>> {
    return this.userRepository.findAll(filters, pagination);
  }

  async updateRoles(id: string, roles: UserRole[]): Promise<User> {
    const user = await this.findById(id);
    user.roles = roles;
    
    const updatedUser = await this.userRepository.update(id, { roles });
    if (!updatedUser) {
      throw new BadRequestException('Failed to update user roles');
    }

    return updatedUser;
  }

  async addRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.addRole(role);
    
    const updatedUser = await this.userRepository.update(id, { roles: user.roles });
    if (!updatedUser) {
      throw new BadRequestException('Failed to add role');
    }

    return updatedUser;
  }

  async removeRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.removeRole(role);
    
    const updatedUser = await this.userRepository.update(id, { roles: user.roles });
    if (!updatedUser) {
      throw new BadRequestException('Failed to remove role');
    }

    return updatedUser;
  }

  async getUserStats(id: string): Promise<{
    totalTrips: number;
    totalDistance: number;
    totalDuration: number;
    preferredMode: string;
  }> {
    await this.findById(id); // Ensure user exists
    return this.userRepository.getUserStats(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.updateLastLogin(id);
  }

  async findOrCreate(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByExternalId(createUserDto.externalId);
    if (existingUser) {
      return existingUser;
    }
    return this.create(createUserDto);
  }

  async exists(id: string): Promise<boolean> {
    return this.userRepository.exists({ id });
  }

  async existsByExternalId(externalId: string): Promise<boolean> {
    return this.userRepository.exists({ externalId });
  }
}