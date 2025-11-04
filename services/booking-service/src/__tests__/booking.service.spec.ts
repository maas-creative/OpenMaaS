import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BookingService } from '../services/booking.service';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingProviderRepository } from '../repositories/booking-provider.repository';
import { ProviderService } from '../services/provider.service';
import { NotificationService } from '../services/notification.service';
import { BookingStatus, BookingType, PassengerType } from '@openmaas/types';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: BookingRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: BookingRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            countActiveBookingsByUser: jest.fn(),
          },
        },
        {
          provide: BookingProviderRepository,
          useValue: {
            findByProviderId: jest.fn(),
          },
        },
        {
          provide: ProviderService,
          useValue: {
            createBooking: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendBookingConfirmation: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'booking.maxBookingsPerUser': 10,
                'booking.advanceBookingDays': 30,
                'booking.expiryMinutes': 15,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingRepository = module.get<BookingRepository>(BookingRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const userId = 'user123';
      const createBookingDto = {
        tripId: 'trip123',
        bookingType: BookingType.SINGLE_TICKET,
        passengers: [
          {
            type: PassengerType.ADULT,
            firstName: 'John',
            lastName: 'Doe',
          },
        ],
        itinerary: {
          legs: [
            {
              mode: 'TRANSIT',
              from: {
                name: 'Tokyo Station',
                coordinates: { lat: 35.6762, lon: 139.6503 },
              },
              to: {
                name: 'Shibuya Station',
                coordinates: { lat: 35.6896, lon: 139.6917 },
              },
              startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              endTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
            },
          ],
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: new Date(Date.now() + 90 * 60 * 1000),
          duration: 1800,
          transfers: 0,
        },
      };

      const mockBooking = {
        id: 'booking123',
        userId,
        status: BookingStatus.PENDING,
        confirmationCode: 'ABC123',
        ...createBookingDto,
      };

      jest.spyOn(bookingRepository, 'countActiveBookingsByUser').mockResolvedValue(5);
      jest.spyOn(bookingRepository, 'create').mockResolvedValue(mockBooking as any);

      const result = await service.createBooking(userId, createBookingDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking123');
      expect(result.userId).toBe(userId);
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(bookingRepository.create).toHaveBeenCalled();
    });

    it('should throw error when booking limit exceeded', async () => {
      const userId = 'user123';
      const createBookingDto = {
        tripId: 'trip123',
        bookingType: BookingType.SINGLE_TICKET,
        passengers: [{ type: PassengerType.ADULT }],
        itinerary: {
          legs: [],
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: new Date(Date.now() + 90 * 60 * 1000),
          duration: 1800,
          transfers: 0,
        },
      };

      jest.spyOn(bookingRepository, 'countActiveBookingsByUser').mockResolvedValue(10);

      await expect(service.createBooking(userId, createBookingDto)).rejects.toThrow(
        'Maximum number of active bookings (10) reached',
      );
    });

    it('should throw error for past booking time', async () => {
      const userId = 'user123';
      const createBookingDto = {
        tripId: 'trip123',
        bookingType: BookingType.SINGLE_TICKET,
        passengers: [{ type: PassengerType.ADULT }],
        itinerary: {
          legs: [],
          startTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          endTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          duration: 1800,
          transfers: 0,
        },
      };

      jest.spyOn(bookingRepository, 'countActiveBookingsByUser').mockResolvedValue(5);

      await expect(service.createBooking(userId, createBookingDto)).rejects.toThrow(
        'Booking start time must be in the future',
      );
    });
  });

  describe('getBooking', () => {
    it('should return booking for valid user', async () => {
      const userId = 'user123';
      const bookingId = 'booking123';
      const mockBooking = {
        id: bookingId,
        userId,
        status: BookingStatus.CONFIRMED,
      };

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);

      const result = await service.getBooking(userId, bookingId);

      expect(result).toBeDefined();
      expect(result.id).toBe(bookingId);
      expect(result.userId).toBe(userId);
    });

    it('should throw error for non-existent booking', async () => {
      const userId = 'user123';
      const bookingId = 'booking123';

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(null);

      await expect(service.getBooking(userId, bookingId)).rejects.toThrow(
        `Booking with ID ${bookingId} not found`,
      );
    });

    it('should throw error for unauthorized access', async () => {
      const userId = 'user123';
      const bookingId = 'booking123';
      const mockBooking = {
        id: bookingId,
        userId: 'otheruser',
        status: BookingStatus.CONFIRMED,
      };

      jest.spyOn(bookingRepository, 'findById').mockResolvedValue(mockBooking as any);

      await expect(service.getBooking(userId, bookingId)).rejects.toThrow(
        'Access denied to this booking',
      );
    });
  });
});
