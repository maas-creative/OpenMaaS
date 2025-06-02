import { Injectable, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from '../repositories/user.repository';
import { UpdatePreferencesDto } from '../dto/user-preferences.dto';
import {
  UserPreferences,
  NotificationPreferences,
  AccessibilityPreferences,
} from '@openmaas/types';

@Injectable()
export class UserPreferencesService {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
  ) {}

  async getPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.userService.findById(userId);
    return user.preferences;
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdatePreferencesDto,
  ): Promise<UserPreferences> {
    const user = await this.userService.findById(userId);

    // Validate language
    if (updateDto.language) {
      const supportedLanguages = ['ja', 'en', 'zh', 'ko'];
      if (!supportedLanguages.includes(updateDto.language)) {
        throw new BadRequestException(`Unsupported language: ${updateDto.language}`);
      }
    }

    // Validate currency
    if (updateDto.currency) {
      const supportedCurrencies = ['JPY', 'USD', 'EUR', 'CNY', 'KRW'];
      if (!supportedCurrencies.includes(updateDto.currency)) {
        throw new BadRequestException(`Unsupported currency: ${updateDto.currency}`);
      }
    }

    // Validate timezone
    if (updateDto.timezone) {
      const supportedTimezones = [
        'Asia/Tokyo',
        'Asia/Seoul',
        'Asia/Shanghai',
        'UTC',
        'America/New_York',
        'Europe/London',
      ];
      if (!supportedTimezones.includes(updateDto.timezone)) {
        throw new BadRequestException(`Unsupported timezone: ${updateDto.timezone}`);
      }
    }

    // Update preferences
    const updatedPreferences: UserPreferences = {
      language: updateDto.language ?? user.preferences.language,
      currency: updateDto.currency ?? user.preferences.currency,
      timezone: updateDto.timezone ?? user.preferences.timezone,
      notifications: user.preferences.notifications,
      accessibility: updateDto.accessibility ?? user.preferences.accessibility,
      defaultPaymentMethod: updateDto.defaultPaymentMethod ?? user.preferences.defaultPaymentMethod,
    };

    // Update nested objects
    if (updateDto.notifications) {
      updatedPreferences.notifications = {
        email: updateDto.notifications.email ?? user.preferences.notifications.email,
        push: updateDto.notifications.push ?? user.preferences.notifications.push,
        sms: updateDto.notifications.sms ?? user.preferences.notifications.sms,
        tripReminders: updateDto.notifications.tripReminders ?? user.preferences.notifications.tripReminders,
        serviceAlerts: updateDto.notifications.serviceAlerts ?? user.preferences.notifications.serviceAlerts,
        promotions: updateDto.notifications.promotions ?? user.preferences.notifications.promotions,
      };
    }

    if (updateDto.accessibility) {
      updatedPreferences.accessibility = {
        ...user.preferences.accessibility,
        ...updateDto.accessibility,
      };
    }

    const updatedUser = await this.userRepository.update(userId, {
      preferences: updatedPreferences,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update preferences');
    }

    return updatedUser.preferences;
  }

  async updateNotificationPreferences(
    userId: string,
    notifications: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const user = await this.userService.findById(userId);

    const updatedNotifications: NotificationPreferences = {
      ...user.preferences.notifications,
      ...notifications,
    };

    const updatedPreferences: UserPreferences = {
      ...user.preferences,
      notifications: updatedNotifications,
    };

    const updatedUser = await this.userRepository.update(userId, {
      preferences: updatedPreferences,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update notification preferences');
    }

    return updatedUser.preferences.notifications;
  }

  async updateAccessibilityPreferences(
    userId: string,
    accessibility: Partial<AccessibilityPreferences>,
  ): Promise<AccessibilityPreferences | undefined> {
    const user = await this.userService.findById(userId);

    const updatedAccessibility: AccessibilityPreferences = {
      ...user.preferences.accessibility,
      ...accessibility,
    };

    const updatedPreferences: UserPreferences = {
      ...user.preferences,
      accessibility: updatedAccessibility,
    };

    const updatedUser = await this.userRepository.update(userId, {
      preferences: updatedPreferences,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update accessibility preferences');
    }

    return updatedUser.preferences.accessibility;
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<UserPreferences> {
    const user = await this.userService.findById(userId);

    const updatedPreferences: UserPreferences = {
      ...user.preferences,
      defaultPaymentMethod: paymentMethodId,
    };

    const updatedUser = await this.userRepository.update(userId, {
      preferences: updatedPreferences,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to set default payment method');
    }

    return updatedUser.preferences;
  }

  async resetPreferences(userId: string): Promise<UserPreferences> {
    await this.userService.findById(userId); // Verify user exists

    const defaultPreferences: UserPreferences = {
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

    const updatedUser = await this.userRepository.update(userId, {
      preferences: defaultPreferences,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to reset preferences');
    }

    return updatedUser.preferences;
  }
}
