import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from '../controllers/payment.controller';
import { PaymentService } from '../services/payment.service';
import { PaymentMethodService } from '../services/payment-method.service';
import { PaymentStatus, PaymentProvider } from '@openmaas/types';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<PaymentService>;
  let paymentMethodService: jest.Mocked<PaymentMethodService>;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockPaymentSession = {
    id: 'payment-123',
    clientSecret: 'secret_123',
    paymentIntentId: 'pi_123',
    amount: 100,
    currency: 'usd',
    status: PaymentStatus.PENDING,
    expiresAt: new Date(),
    publishableKey: 'pk_test_123',
  };

  const mockPayment = {
    id: 'payment-123',
    userId: mockUser.userId,
    bookingId: 'booking-123',
    amount: 100,
    currency: 'usd',
    status: PaymentStatus.COMPLETED,
    paymentMethodId: 'pm-123',
    provider: PaymentProvider.STRIPE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentMethod = {
    id: 'pm-123',
    userId: mockUser.userId,
    type: 'CREDIT_CARD',
    provider: PaymentProvider.STRIPE,
    last4: '4242',
    brand: 'visa',
    isDefault: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            createPayment: jest.fn(),
            processPayment: jest.fn(),
            getPayment: jest.fn(),
            getPaymentHistory: jest.fn(),
            createRefund: jest.fn(),
          },
        },
        {
          provide: PaymentMethodService,
          useValue: {
            addPaymentMethod: jest.fn(),
            getPaymentMethods: jest.fn(),
            getPaymentMethod: jest.fn(),
            setDefaultPaymentMethod: jest.fn(),
            removePaymentMethod: jest.fn(),
            syncStripePaymentMethods: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get(PaymentService);
    paymentMethodService = module.get(PaymentMethodService);
  });

  describe('createPayment', () => {
    it('should create a payment session', async () => {
      const dto = {
        amount: 10000,
        currency: 'usd',
        bookingId: 'booking-123',
        paymentMethodId: 'pm-123',
        description: 'Test payment',
      };

      paymentService.createPayment.mockResolvedValue(mockPaymentSession);

      const result = await controller.createPayment({ user: mockUser }, dto);

      expect(result).toEqual(mockPaymentSession);
      expect(paymentService.createPayment).toHaveBeenCalledWith(mockUser.userId, dto);
    });
  });

  describe('processPayment', () => {
    it('should process a payment', async () => {
      const dto = { paymentMethodId: 'pm-123' };

      paymentService.processPayment.mockResolvedValue(mockPayment as any);

      const result = await controller.processPayment({ user: mockUser }, 'payment-123', dto);

      expect(result).toEqual(mockPayment);
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        mockUser.userId,
        'payment-123',
        dto,
      );
    });
  });

  describe('getPayment', () => {
    it('should get payment details', async () => {
      paymentService.getPayment.mockResolvedValue(mockPayment as any);

      const result = await controller.getPayment({ user: mockUser }, 'payment-123');

      expect(result).toEqual(mockPayment);
      expect(paymentService.getPayment).toHaveBeenCalledWith(mockUser.userId, 'payment-123');
    });
  });

  describe('getPaymentHistory', () => {
    it('should get payment history', async () => {
      const mockHistory = {
        payments: [mockPayment],
        total: 1,
        limit: 20,
        offset: 0,
      };

      paymentService.getPaymentHistory.mockResolvedValue(mockHistory);

      const query = { limit: 20, offset: 0 };
      const result = await controller.getPaymentHistory({ user: mockUser }, query);

      expect(result).toEqual(mockHistory);
      expect(paymentService.getPaymentHistory).toHaveBeenCalledWith(mockUser.userId, query);
    });
  });

  describe('createRefund', () => {
    it('should create a refund', async () => {
      const dto = {
        paymentId: 'payment-123',
        amount: 50,
        reason: 'Customer request',
      };

      const mockRefund = {
        id: 'refund-123',
        paymentId: dto.paymentId,
        amount: dto.amount,
        currency: 'usd',
        status: 'PROCESSING',
        reason: dto.reason,
        createdAt: new Date(),
      };

      paymentService.createRefund.mockResolvedValue(mockRefund);

      const result = await controller.createRefund({ user: mockUser }, dto);

      expect(result).toEqual(mockRefund);
      expect(paymentService.createRefund).toHaveBeenCalledWith(mockUser.userId, dto);
    });
  });

  describe('getPaymentMethods', () => {
    it('should get payment methods', async () => {
      paymentMethodService.getPaymentMethods.mockResolvedValue([mockPaymentMethod as any]);

      const result = await controller.getPaymentMethods({ user: mockUser });

      expect(result).toEqual([mockPaymentMethod]);
      expect(paymentMethodService.getPaymentMethods).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('addPaymentMethod', () => {
    it('should add a payment method', async () => {
      const dto = {
        stripePaymentMethodId: 'stripe_pm_123',
        setAsDefault: true,
      };

      paymentMethodService.addPaymentMethod.mockResolvedValue(mockPaymentMethod as any);

      const result = await controller.addPaymentMethod({ user: mockUser }, dto);

      expect(result).toEqual(mockPaymentMethod);
      expect(paymentMethodService.addPaymentMethod).toHaveBeenCalledWith(mockUser.userId, dto);
    });
  });

  describe('removePaymentMethod', () => {
    it('should remove a payment method', async () => {
      await controller.removePaymentMethod({ user: mockUser }, 'pm-123');

      expect(paymentMethodService.removePaymentMethod).toHaveBeenCalledWith(
        mockUser.userId,
        'pm-123',
      );
    });
  });
});
