export interface Booking {
  id: string;
  userId: string;
  tripId: string;
  status: BookingStatus;
  bookingType: BookingType;
  passengers: Passenger[];
  itinerary: BookingItinerary;
  fare: BookingFare;
  paymentId?: string;
  confirmationCode: string;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
  validFrom: Date;
  validUntil: Date;
  cancellationPolicy?: CancellationPolicy;
  metadata?: Record<string, any>;
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

export enum BookingType {
  SINGLE_TICKET = 'single_ticket',
  RETURN_TICKET = 'return_ticket',
  MULTI_RIDE = 'multi_ride',
  PASS = 'pass',
  RESERVATION = 'reservation',
}

export interface Passenger {
  type: PassengerType;
  firstName?: string;
  lastName?: string;
  age?: number;
  requiresAssistance?: boolean;
  assistanceType?: string[];
}

export enum PassengerType {
  ADULT = 'adult',
  CHILD = 'child',
  SENIOR = 'senior',
  STUDENT = 'student',
  DISABLED = 'disabled',
}

export interface BookingItinerary {
  legs: BookingLeg[];
  startTime: Date;
  endTime: Date;
  duration: number;
  transfers: number;
}

export interface BookingLeg {
  mode: string;
  from: BookingPlace;
  to: BookingPlace;
  startTime: Date;
  endTime: Date;
  routeId?: string;
  tripId?: string;
  serviceProvider?: string;
  seatNumber?: string;
  platform?: string;
  vehicleId?: string;
}

export interface BookingPlace {
  name: string;
  stopId?: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  address?: string;
}

export interface BookingFare {
  amount: number;
  currency: string;
  breakdown: FareBreakdown[];
  discounts?: Discount[];
  totalAmount: number;
}

export interface FareBreakdown {
  type: string;
  description: string;
  amount: number;
  quantity: number;
}

export interface Discount {
  code: string;
  description: string;
  amount: number;
  type: 'percentage' | 'fixed';
}

export interface CancellationPolicy {
  refundable: boolean;
  cancellationDeadline?: Date;
  cancellationFee?: number;
  refundPercentage?: number;
}

export interface CreateBookingDto {
  tripId: string;
  bookingType: BookingType;
  passengers: Passenger[];
  itinerary: BookingItinerary;
  paymentMethodId?: string;
  discountCode?: string;
}

export interface UpdateBookingDto {
  passengers?: Passenger[];
  metadata?: Record<string, any>;
}

export interface CancelBookingDto {
  reason?: string;
  refundRequested?: boolean;
}

export interface BookingSearchParams {
  userId?: string;
  status?: BookingStatus;
  fromDate?: Date;
  toDate?: Date;
  confirmationCode?: string;
  limit?: number;
  offset?: number;
}