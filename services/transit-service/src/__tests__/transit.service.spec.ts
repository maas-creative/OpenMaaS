import { Test, TestingModule } from '@nestjs/testing';
import { TransitService } from '../services/transit.service';
import { AgencyRepository } from '../repositories/agency.repository';
import { StopRepository } from '../repositories/stop.repository';
import { RouteRepository } from '../repositories/route.repository';
import { NotFoundException } from '@nestjs/common';

describe('TransitService', () => {
  let service: TransitService;
  let agencyRepository: AgencyRepository;
  let stopRepository: StopRepository;
  let routeRepository: RouteRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransitService,
        {
          provide: AgencyRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: StopRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findNearby: jest.fn(),
            search: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: RouteRepository,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByAgency: jest.fn(),
            findByType: jest.fn(),
            search: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransitService>(TransitService);
    agencyRepository = module.get<AgencyRepository>(AgencyRepository);
    stopRepository = module.get<StopRepository>(StopRepository);
    routeRepository = module.get<RouteRepository>(RouteRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAgencies', () => {
    it('should return all agencies', async () => {
      const mockAgencies = [
        {
          agencyId: 'test-agency',
          agencyName: 'Test Transit Agency',
          agencyTimezone: 'America/New_York',
        },
      ];

      jest.spyOn(agencyRepository, 'findAll').mockResolvedValue(mockAgencies as any);

      const result = await service.getAgencies();

      expect(result).toHaveLength(1);
      expect(result[0].agencyId).toBe('test-agency');
      expect(agencyRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('getAgency', () => {
    it('should return a specific agency', async () => {
      const mockAgency = {
        agencyId: 'test-agency',
        agencyName: 'Test Transit Agency',
        agencyTimezone: 'America/New_York',
      };

      jest.spyOn(agencyRepository, 'findById').mockResolvedValue(mockAgency as any);

      const result = await service.getAgency('test-agency');

      expect(result.agencyId).toBe('test-agency');
      expect(agencyRepository.findById).toHaveBeenCalledWith('test-agency');
    });

    it('should throw NotFoundException when agency not found', async () => {
      jest.spyOn(agencyRepository, 'findById').mockResolvedValue(null);

      await expect(service.getAgency('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStops', () => {
    it('should search stops by location', async () => {
      const mockStops = [
        {
          stopId: 'stop-1',
          stopName: 'Main Street Station',
          stopLat: 40.7128,
          stopLon: -74.006,
        },
      ];

      jest.spyOn(stopRepository, 'findNearby').mockResolvedValue(mockStops as any);

      const result = await service.getStops({
        lat: 40.7128,
        lon: -74.006,
        radius: 1000,
      });

      expect(result).toHaveLength(1);
      expect(result[0].stopId).toBe('stop-1');
      expect(stopRepository.findNearby).toHaveBeenCalledWith(40.7128, -74.006, 1000, 20);
    });

    it('should search stops by text', async () => {
      const mockStops = [
        {
          stopId: 'stop-1',
          stopName: 'Central Station',
          stopLat: 40.7128,
          stopLon: -74.006,
        },
      ];

      jest.spyOn(stopRepository, 'search').mockResolvedValue(mockStops as any);

      const result = await service.getStops({ search: 'Central' });

      expect(result).toHaveLength(1);
      expect(result[0].stopName).toContain('Central');
      expect(stopRepository.search).toHaveBeenCalledWith('Central', 20);
    });
  });
});
