import { IsString, IsOptional, IsUrl, IsTimeZone } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Agency } from '@openmaas/types';

export class CreateAgencyDto implements Omit<Agency, 'agencyId'> {
  @ApiProperty()
  @IsString()
  agencyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  agencyUrl?: string;

  @ApiProperty()
  @IsTimeZone()
  agencyTimezone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyLang?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  agencyFareUrl?: string;
}

export class UpdateAgencyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  agencyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsTimeZone()
  agencyTimezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyLang?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agencyPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  agencyFareUrl?: string;
}

export class AgencyResponseDto implements Agency {
  @ApiProperty()
  agencyId: string;

  @ApiProperty()
  agencyName: string;

  @ApiPropertyOptional()
  agencyUrl?: string;

  @ApiProperty()
  agencyTimezone: string;

  @ApiPropertyOptional()
  agencyLang?: string;

  @ApiPropertyOptional()
  agencyPhone?: string;

  @ApiPropertyOptional()
  agencyFareUrl?: string;
}