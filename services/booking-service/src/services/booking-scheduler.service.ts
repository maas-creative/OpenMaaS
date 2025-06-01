import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingRepository } from '../repositories/booking.repository';
import { NotificationService } from './notification.service';
// import { BookingStatus } from '@openmaas/types'; // Currently unused

@Injectable()
export class BookingSchedulerService {
  private readonly logger = new Logger(BookingSchedulerService.name);

  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredBookings(): Promise<void> {
    try {
      // Update expired pending bookings
      await this.bookingRepository.bulkUpdateExpiredBookings();

      const expiredBookings = await this.bookingRepository.findExpiredBookings();
      this.logger.log(`Processed ${expiredBookings.length} expired bookings`);
    } catch (error) {
      this.logger.error('Error processing expired bookings:', error);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendBookingReminders(): Promise<void> {
    try {
      // Find bookings that start in the next 1-2 hours
      const now = new Date();
      // const reminderStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const reminderEnd = new Date(now.getTime() + 120 * 60 * 1000); // 2 hours from now

      // This would need a proper query to find bookings in the reminder window
      // For now, we'll log that reminders would be sent
      this.logger.log('Checking for booking reminders to send...');

      // In a real implementation:
      // const upcomingBookings = await this.bookingRepository.findBookingsInTimeRange(reminderStart, reminderEnd);
      // for (const booking of upcomingBookings) {
      //   await this.notificationService.sendBookingReminder(booking);
      // }
    } catch (error) {
      this.logger.error('Error sending booking reminders:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncProviderBookings(): Promise<void> {
    try {
      // Sync booking status with external providers
      this.logger.log('Syncing booking status with external providers...');

      // In a real implementation, this would:
      // 1. Find bookings with provider booking IDs
      // 2. Query each provider for status updates
      // 3. Update local booking status if changed
      // 4. Send notifications for status changes
    } catch (error) {
      this.logger.error('Error syncing provider bookings:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupOldBookings(): Promise<void> {
    try {
      // Clean up old completed/cancelled bookings (e.g., older than 30 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      this.logger.log(`Cleaning up bookings older than ${cutoffDate.toISOString()}`);

      // In a real implementation, this might:
      // 1. Archive old bookings to a separate table
      // 2. Delete very old archived bookings
      // 3. Update statistics
    } catch (error) {
      this.logger.error('Error cleaning up old bookings:', error);
    }
  }
}
