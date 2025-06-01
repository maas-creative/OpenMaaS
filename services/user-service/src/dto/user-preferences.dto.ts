import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationPreferences, AccessibilityPreferences } from '@openmaas/types';

class NotificationPreferencesDto implements Partial<NotificationPreferences> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tripReminders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  serviceAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;
}

class AccessibilityPreferencesDto implements Partial<AccessibilityPreferences> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  wheelchairAccess?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  audioAnnouncements?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  largeText?: boolean;

  @ApiPropertyOptional({ enum: ['slow', 'normal', 'fast'] })
  @IsOptional()
  @IsEnum(['slow', 'normal', 'fast'])
  preferredWalkingSpeed?: 'slow' | 'normal' | 'fast';
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: 'ja' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'JPY' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Tokyo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: Partial<NotificationPreferences>;

  @ApiPropertyOptional({ type: AccessibilityPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessibilityPreferencesDto)
  accessibility?: Partial<AccessibilityPreferences>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultPaymentMethod?: string;
}

export class UpdateNotificationPreferencesDto extends NotificationPreferencesDto {}

export class UpdateAccessibilityPreferencesDto extends AccessibilityPreferencesDto {}
