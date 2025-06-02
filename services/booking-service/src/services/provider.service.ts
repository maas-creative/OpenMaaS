import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { BookingProviderEntity } from '../entities/booking-provider.entity';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.timeout = this.configService.get('providers.apiTimeout') || 30000;
  }

  async createBooking(provider: BookingProviderEntity, booking: any, leg: any): Promise<any> {
    try {
      const payload = this.buildProviderBookingPayload(booking, leg);
      const response = await this.makeProviderRequest(provider, 'POST', '/bookings', payload);

      this.logger.log(`Booking created with provider ${provider.providerName}: ${response.id}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create booking with provider ${provider.providerName}:`, error);
      throw error;
    }
  }

  async updateBooking(provider: BookingProviderEntity, booking: any): Promise<any> {
    try {
      const payload = this.buildProviderUpdatePayload(booking);
      const response = await this.makeProviderRequest(
        provider,
        'PUT',
        `/bookings/${booking.providerBookingId}`,
        payload,
      );

      this.logger.log(
        `Booking updated with provider ${provider.providerName}: ${booking.providerBookingId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to update booking with provider ${provider.providerName}:`, error);
      throw error;
    }
  }

  async cancelBooking(provider: BookingProviderEntity, booking: any): Promise<void> {
    try {
      await this.makeProviderRequest(provider, 'DELETE', `/bookings/${booking.providerBookingId}`);

      this.logger.log(
        `Booking cancelled with provider ${provider.providerName}: ${booking.providerBookingId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to cancel booking with provider ${provider.providerName}:`, error);
      throw error;
    }
  }

  async getBookingStatus(provider: BookingProviderEntity, providerBookingId: string): Promise<any> {
    try {
      const response = await this.makeProviderRequest(
        provider,
        'GET',
        `/bookings/${providerBookingId}/status`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get booking status from provider ${provider.providerName}:`,
        error,
      );
      throw error;
    }
  }

  async validateAvailability(provider: BookingProviderEntity, leg: any): Promise<boolean> {
    try {
      const payload = {
        routeId: leg.routeId,
        tripId: leg.tripId,
        startTime: leg.startTime,
        endTime: leg.endTime,
        passengers: leg.passengers?.length || 1,
      };

      const response = await this.makeProviderRequest(
        provider,
        'POST',
        '/availability/check',
        payload,
      );

      return response.available === true;
    } catch (error) {
      this.logger.error(
        `Failed to check availability with provider ${provider.providerName}:`,
        error,
      );
      return false;
    }
  }

  private async makeProviderRequest(
    provider: BookingProviderEntity,
    method: string,
    endpoint: string,
    body?: any,
  ): Promise<any> {
    const url = `${provider.apiEndpoint}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OpenMaaS-BookingService/1.0',
    };

    if (provider.apiKeyId) {
      headers['Authorization'] = `Bearer ${provider.apiKeyId}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      timeout: this.timeout,
    });

    if (!response.ok) {
      throw new Error(`Provider API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private buildProviderBookingPayload(booking: any, leg: any): any {
    return {
      externalBookingId: booking.id,
      confirmationCode: booking.confirmationCode,
      passengers: booking.passengers,
      leg: {
        from: leg.from,
        to: leg.to,
        startTime: leg.startTime,
        endTime: leg.endTime,
        routeId: leg.routeId,
        tripId: leg.tripId,
      },
      preferences: {
        wheelchairAccessible: booking.passengers.some((p: any) => p.requiresAssistance),
        seatPreferences: [],
      },
      metadata: {
        source: 'openmaas',
        version: '1.0',
      },
    };
  }

  private buildProviderUpdatePayload(booking: any): any {
    return {
      passengers: booking.passengers,
      metadata: booking.metadata,
    };
  }
}
