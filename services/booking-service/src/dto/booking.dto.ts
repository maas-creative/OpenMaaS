import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BookingStatus,
  BookingType,
  Passenger,
  PassengerType,
  BookingItinerary,
  BookingLeg,
  BookingPlace,
  BookingFare,
  FareBreakdown,
  Discount,
  CancellationPolicy,
} from '@openmaas/types';

export class PassengerDto implements Passenger {
  @ApiProperty({ enum: PassengerType })
  @IsEnum(PassengerType)
  type: PassengerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresAssistance?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assistanceType?: string[];
}

export class BookingPlaceDto implements BookingPlace {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stopId?: string;

  @ApiProperty()
  coordinates: {
    lat: number;
    lon: number;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class BookingLegDto implements BookingLeg {
  @ApiProperty()
  @IsString()
  mode: string;

  @ApiProperty({ type: BookingPlaceDto })
  @ValidateNested()
  @Type(() => BookingPlaceDto)
  from: BookingPlaceDto;

  @ApiProperty({ type: BookingPlaceDto })
  @ValidateNested()
  @Type(() => BookingPlaceDto)
  to: BookingPlaceDto;

  @ApiProperty()
  @IsDateString()
  startTime: Date;

  @ApiProperty()
  @IsDateString()
  endTime: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tripId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;
}

export class BookingItineraryDto implements BookingItinerary {
  @ApiProperty({ type: [BookingLegDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingLegDto)
  legs: BookingLegDto[];

  @ApiProperty()
  @IsDateString()
  startTime: Date;

  @ApiProperty()
  @IsDateString()
  endTime: Date;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  transfers: number;
}

export class FareBreakdownDto implements FareBreakdown {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class DiscountDto implements Discount {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: ['percentage', 'fixed'] })
  @IsEnum(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';
}

export class BookingFareDto implements BookingFare {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty({ type: [FareBreakdownDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FareBreakdownDto)
  breakdown: FareBreakdownDto[];

  @ApiPropertyOptional({ type: [DiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  totalAmount: number;
}

export class CreateBookingDto {
  @ApiProperty()
  @IsString()
  tripId: string;

  @ApiProperty({ enum: BookingType })
  @IsEnum(BookingType)
  bookingType: BookingType;

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiProperty({ type: BookingItineraryDto })
  @ValidateNested()
  @Type(() => BookingItineraryDto)
  itinerary: BookingItineraryDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateBookingDto {
  @ApiPropertyOptional({ type: [PassengerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers?: PassengerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  refundRequested?: boolean;
}

export class BookingSearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmationCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

export class CancellationPolicyDto implements CancellationPolicy {
  @ApiProperty()
  @IsBoolean()
  refundable: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  cancellationDeadline?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  cancellationFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  refundPercentage?: number;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  tripId: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty({ enum: BookingType })
  bookingType: BookingType;

  @ApiProperty({ type: [PassengerDto] })
  passengers: PassengerDto[];

  @ApiProperty({ type: BookingItineraryDto })
  itinerary: BookingItineraryDto;

  @ApiProperty({ type: BookingFareDto })
  fare: BookingFareDto;

  @ApiPropertyOptional()
  paymentId?: string;

  @ApiProperty()
  confirmationCode: string;

  @ApiPropertyOptional()
  qrCode?: string;

  @ApiProperty()
  validFrom: Date;

  @ApiProperty()
  validUntil: Date;

  @ApiPropertyOptional({ type: CancellationPolicyDto })
  cancellationPolicy?: CancellationPolicyDto;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BookingListResponseDto {
  @ApiProperty({ type: [BookingResponseDto] })
  bookings: BookingResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}
