import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RouteService } from '../services/route.service';
import { OtpService } from '../services/otp.service';
import { CacheService } from '../services/cache.service';
import { TransportMode } from '@openmaas/types';

describe('RouteService', () => {
  let service: RouteService;
  let otpService: OtpService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        {
          provide: OtpService,
          useValue: {
            planRoute: jest.fn(),
            geocode: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'routePlanning.maxWalkDistance': 2000,
                'routePlanning.defaultNumItineraries': 3,
                'app.env': 'test',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
    otpService = module.get<OtpService>(OtpService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('planRoute', () => {
    it('should return cached result if available', async () => {
      const mockRequest = {
        from: { lat: 35.6762, lon: 139.6503, name: 'Tokyo Station' },
        to: { lat: 35.6896, lon: 139.6917, name: 'Shibuya Station' },
        modes: [TransportMode.WALK, TransportMode.TRANSIT],
      };

      const mockResponse = {
        itineraries: [
          {
            startTime: new Date(),
            endTime: new Date(),
            duration: 1800,
            transfers: 1,
            walkDistance: 500,
            walkTime: 360,
            waitingTime: 120,
            legs: [],
          },
        ],
        requestParameters: mockRequest,
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockResponse);

      const result = await service.planRoute(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(cacheService.get).toHaveBeenCalled();
      expect(otpService.planRoute).not.toHaveBeenCalled();
    });

    it('should call OTP service when no cache hit', async () => {
      const mockRequest = {
        from: { lat: 35.6762, lon: 139.6503, name: 'Tokyo Station' },
        to: { lat: 35.6896, lon: 139.6917, name: 'Shibuya Station' },
        modes: [TransportMode.WALK, TransportMode.TRANSIT],
      };

      const mockResponse = {
        itineraries: [
          {
            startTime: new Date(),
            endTime: new Date(),
            duration: 1800,
            transfers: 1,
            walkDistance: 500,
            walkTime: 360,
            waitingTime: 120,
            legs: [],
          },
        ],
        requestParameters: mockRequest,
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(otpService, 'planRoute').mockResolvedValue(mockResponse);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await service.planRoute(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(cacheService.get).toHaveBeenCalled();
      expect(otpService.planRoute).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should enhance request with default values', async () => {
      const mockRequest = {
        from: { lat: 35.6762, lon: 139.6503 },
        to: { lat: 35.6896, lon: 139.6917 },
      };

      const mockResponse = {
        itineraries: [],
        requestParameters: mockRequest,
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(otpService, 'planRoute').mockResolvedValue(mockResponse);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      await service.planRoute(mockRequest);

      expect(otpService.planRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          modes: [TransportMode.WALK, TransportMode.TRANSIT],
          maxWalkDistance: 2000,
          numItineraries: 3,
          dateTime: expect.any(String),
          arriveBy: false,
        }),
      );
    });
  });

  describe('geocode', () => {
    it('should return cached geocoding result if available', async () => {
      const mockRequest = {
        query: 'Tokyo Station',
        limit: 5,
      };

      const mockResponse = {
        query: 'Tokyo Station',
        results: [
          {
            lat: 35.6762,
            lon: 139.6503,
            name: 'Tokyo Station',
          },
        ],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockResponse);

      const result = await service.geocode(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(cacheService.get).toHaveBeenCalled();
      expect(otpService.geocode).not.toHaveBeenCalled();
    });

    it('should call OTP service when no cache hit for geocoding', async () => {
      const mockRequest = {
        query: 'Tokyo Station',
        limit: 5,
      };

      const mockResponse = {
        query: 'Tokyo Station',
        results: [
          {
            lat: 35.6762,
            lon: 139.6503,
            name: 'Tokyo Station',
          },
        ],
      };

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(otpService, 'geocode').mockResolvedValue(mockResponse);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await service.geocode(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(cacheService.get).toHaveBeenCalled();
      expect(otpService.geocode).toHaveBeenCalledWith(mockRequest);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('reverseGeocode', () => {
    it('should return location information for coordinates', async () => {
      const lat = 35.6762;
      const lon = 139.6503;

      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue();

      const result = await service.reverseGeocode(lat, lon);

      expect(result).toEqual({
        query: `${lat},${lon}`,
        results: [
          {
            lat,
            lon,
            name: `Location at ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          },
        ],
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});