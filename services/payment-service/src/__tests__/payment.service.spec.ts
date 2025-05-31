import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { StripeService } from '../services/stripe.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentStatus, PaymentProvider, RefundStatus } from '@openmaas/types';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let paymentMethodRepository: jest.Mocked<PaymentMethodRepository>;
  let refundRepository: jest.Mocked<RefundRepository>;
  let stripeService: jest.Mocked<StripeService>;

  const mockUserId = 'user-123';
  const mockPaymentId = 'payment-123';
  const mockPaymentMethodId = 'pm-123';
  
  const mockPayment = {
    id: mockPaymentId,
    userId: mockUserId,
    bookingId: 'booking-123',
    amount: 100.00,
    currency: 'usd',
    status: PaymentStatus.PENDING,
    paymentMethodId: mockPaymentMethodId,
    provider: PaymentProvider.STRIPE,
    stripePaymentIntentId: 'pi_test123',
  };

  const mockPaymentMethod = {
    id: mockPaymentMethodId,
    userId: mockUserId,
    stripePaymentMethodId: 'stripe_pm_123',
    stripeCustomerId: 'cus_123',
  };

  const mockPaymentIntent = {
    id: 'pi_test123',
    client_secret: 'pi_test123_secret',
    status: 'succeeded',
    charges: {
      data: [{
        id: 'ch_123',
        receipt_url: 'https://receipt.url',
      }],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByIdempotencyKey: jest.fn(),
            findByStripePaymentIntentId: jest.fn(),
            findAll: jest.fn(),
            updateStatus: jest.fn(),
            incrementRefundedAmount: jest.fn(),
          },
        },
        {
          provide: PaymentMethodRepository,
          useValue: {
            findByUserAndId: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: RefundRepository,
          useValue: {
            create: jest.fn(),
            getTotalRefundedAmount: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            createCustomer: jest.fn(),
            createPaymentIntent: jest.fn(),
            confirmPaymentIntent: jest.fn(),
            createRefund: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                'stripe.publishableKey': 'pk_test_123',
                'payment.refundWindowDays': 30,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get(PaymentRepository);
    paymentMethodRepository = module.get(PaymentMethodRepository);
    refundRepository = module.get(RefundRepository);
    stripeService = module.get(StripeService);
  });

  describe('createPayment', () => {
    it('should create a payment successfully', async () => {
      const dto = {
        amount: 10000, // $100 in cents
        currency: 'usd',
        bookingId: 'booking-123',
        paymentMethodId: mockPaymentMethodId,
        description: 'Test payment',
      };

      paymentMethodRepository.findByUserAndId.mockResolvedValue(mockPaymentMethod);
      stripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent as any);
      paymentRepository.create.mockResolvedValue(mockPayment as any);

      const result = await service.createPayment(mockUserId, dto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('clientSecret');
      expect(result.amount).toBe(100);
      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          amount: 100,
          currency: 'usd',
        }),
      );
    });

    it('should throw error for invalid payment method', async () => {
      const dto = {
        amount: 10000,
        currency: 'usd',
        bookingId: 'booking-123',
        paymentMethodId: 'invalid-pm',
        description: 'Test payment',
      };

      paymentMethodRepository.findByUserAndId.mockResolvedValue(null);

      await expect(service.createPayment(mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      paymentRepository.findById.mockResolvedValue(mockPayment as any);
      stripeService.confirmPaymentIntent.mockResolvedValue({
        ...mockPaymentIntent,
        status: 'succeeded',
      } as any);
      paymentRepository.findById.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      } as any);

      const result = await service.processPayment(
        mockUserId,
        mockPaymentId,
        { paymentMethodId: mockPaymentMethodId },
      );

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
        mockPaymentId,
        PaymentStatus.COMPLETED,
        expect.any(Object),
      );
    });

    it('should throw error for non-existent payment', async () => {
      paymentRepository.findById.mockResolvedValue(null);

      await expect(
        service.processPayment(mockUserId, 'invalid-id', { 
          paymentMethodId: mockPaymentMethodId 
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createRefund', () => {
    it('should create refund successfully', async () => {
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
      };

      const dto = {
        paymentId: mockPaymentId,
        amount: 50,
        reason: 'Customer request',
      };

      paymentRepository.findById.mockResolvedValue(completedPayment as any);
      refundRepository.getTotalRefundedAmount.mockResolvedValue(0);
      stripeService.createRefund.mockResolvedValue({
        id: 'refund_123',
        status: 'succeeded',
      } as any);
      refundRepository.create.mockResolvedValue({
        id: 'refund-123',
        paymentId: mockPaymentId,
        amount: 50,
        currency: 'usd',
        status: RefundStatus.PROCESSING,
        reason: dto.reason,
        createdAt: new Date(),
      } as any);

      const result = await service.createRefund(mockUserId, dto);

      expect(result).toHaveProperty('id');
      expect(result.amount).toBe(50);
      expect(refundRepository.create).toHaveBeenCalled();
      expect(paymentRepository.incrementRefundedAmount).toHaveBeenCalledWith(
        mockPaymentId,
        50,
      );
    });

    it('should throw error for exceeding refund amount', async () => {
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
      };

      const dto = {
        paymentId: mockPaymentId,
        amount: 150,
        reason: 'Customer request',
      };

      paymentRepository.findById.mockResolvedValue(completedPayment as any);
      refundRepository.getTotalRefundedAmount.mockResolvedValue(0);

      await expect(service.createRefund(mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history', async () => {
      const payments = [mockPayment, { ...mockPayment, id: 'payment-456' }];
      
      paymentRepository.findAll.mockResolvedValue({
        payments: payments as any[],
        total: 2,
      });

      const result = await service.getPaymentHistory(mockUserId, {
        limit: 20,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.payments).toHaveLength(2);
      expect(paymentRepository.findAll).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        undefined,
        undefined,
        undefined,
        20,
        0,
      );
    });
  });
});