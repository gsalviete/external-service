import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus } from './payment.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let _repo: Repository<Payment>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((_key: string) => {
      // Return undefined for STRIPE_SECRET_KEY to use fallback mock logic in tests
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    _repo = module.get<Repository<Payment>>(getRepositoryToken(Payment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create and save a payment with PAID status (90% success)', async () => {
      // Mock Math.random to return 0.15 (>= 0.1, should succeed)
      jest.spyOn(Math, 'random').mockReturnValue(0.15);

      const dto = {
        valor: 10.0,
        ciclista: 1,
      };

      const savedPayment = {
        id: 1,
        ...dto,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.createPayment(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: PaymentStatus.PAID,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.PAID);

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should create and save a payment with FAILED status (10% failure)', async () => {
      // Mock Math.random to return 0.05 (< 0.1, should fail)
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      const dto = {
        valor: 10.0,
        ciclista: 1,
      };

      const savedPayment = {
        id: 1,
        ...dto,
        status: PaymentStatus.FAILED,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.createPayment(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: PaymentStatus.FAILED,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.FAILED);

      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('addToQueue', () => {
    it('should add payment to queue with PENDING status', async () => {
      const dto = {
        valor: 5.0,
        ciclista: 2,
      };

      const queuedPayment = {
        id: 2,
        ...dto,
        status: PaymentStatus.PENDING,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(queuedPayment);
      mockRepository.save.mockResolvedValue(queuedPayment);

      const result = await service.addToQueue(dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        status: PaymentStatus.PENDING,
      });
      expect(result.status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('processQueue', () => {
    it('should process pending payments', async () => {
      const pendingPayments = [
        {
          id: 1,
          valor: 10,
          ciclista: 1,
          status: PaymentStatus.PENDING,
          horaSolicitacao: new Date(),
          horaFinalizacao: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(pendingPayments);
      mockRepository.save.mockResolvedValue(
        pendingPayments.map((p) => ({ ...p, status: PaymentStatus.PAID })),
      );

      const result = await service.processQueue();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: PaymentStatus.PENDING },
      });
      expect(result[0].status).toBe(PaymentStatus.PAID);
    });
  });

  describe('findOne', () => {
    it('should return a single payment', async () => {
      const payment = {
        id: 1,
        valor: 10,
        ciclista: 1,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.findOneBy.mockResolvedValue(payment);

      const result = await service.findOne(1);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(payment);
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateCreditCard', () => {
    it('should validate valid credit card successfully', async () => {
      const cardData = {
        numero: '4532015112830366', // Valid Visa test card
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '123',
      };

      const result = await service.validateCreditCard(cardData);

      expect(result).toEqual({ valid: true });
    });

    it('should throw BadRequestException for invalid card number (Luhn check)', async () => {
      const cardData = {
        numero: '1234567890123456', // Invalid - fails Luhn algorithm
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '123',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid card number',
      );
    });

    it('should throw BadRequestException for empty card number', async () => {
      const cardData = {
        numero: '',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '123',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Card number is required',
      );
    });

    it('should throw BadRequestException for expired card', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2020', // Expired
        cvv: '123',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Card has expired',
      );
    });

    it('should throw BadRequestException for invalid CVV (too short)', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '12', // Too short
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid CVV',
      );
    });

    it('should throw BadRequestException for invalid CVV (too long)', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '12345', // Too long
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid CVV',
      );
    });

    it('should throw BadRequestException for non-numeric CVV', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: 'abc',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid CVV',
      );
    });

    it('should throw BadRequestException for empty CVV', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid CVV',
      );
    });

    it('should throw BadRequestException for wrong date pattern (not MM/YYYY)', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/25', // Should be 12/2025
        cvv: '123',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid expiration date',
      );
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '13/2025', // Invalid month
        cvv: '123',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid expiration date',
      );
    });

    it('should throw BadRequestException for empty cardholder name', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: '',
        validade: '12/2025',
        cvv: '123',
      };

      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateCreditCard(cardData)).rejects.toThrow(
        'Cardholder name is required',
      );
    });
  });

  describe('processCharge', () => {
    it('should process charge successfully with valid card', async () => {
      const chargeData = {
        valor: 50.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      const savedPayment = {
        id: 1,
        valor: 50.0,
        ciclista: 1,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.processCharge(chargeData);

      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.valor).toBe(50.0);
    });

    it('should reject charge with invalid card', async () => {
      const chargeData = {
        valor: 50.0,
        ciclista: 1,
        cardData: {
          numero: '1234567890123456', // Invalid
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      await expect(service.processCharge(chargeData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processCharge(chargeData)).rejects.toThrow(
        'Invalid card number',
      );
    });

    it('should simulate random payment failures (10% failure rate)', async () => {
      const chargeData = {
        valor: 50.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      // Mock Math.random to return 0.05 (< 0.1, should fail)
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      const savedPayment = {
        id: 1,
        valor: 50.0,
        ciclista: 1,
        status: PaymentStatus.FAILED,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.processCharge(chargeData);

      expect(result.status).toBe(PaymentStatus.FAILED);

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should process charge successfully when random check passes (90% success)', async () => {
      const chargeData = {
        valor: 50.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      // Mock Math.random to return 0.15 (>= 0.1, should succeed)
      jest.spyOn(Math, 'random').mockReturnValue(0.15);

      const savedPayment = {
        id: 1,
        valor: 50.0,
        ciclista: 1,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await service.processCharge(chargeData);

      expect(result.status).toBe(PaymentStatus.PAID);

      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const chargeData = {
        valor: -10.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      await expect(service.processCharge(chargeData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processCharge(chargeData)).rejects.toThrow(
        'Amount must be positive',
      );
    });

    it('should throw BadRequestException for zero amount', async () => {
      const chargeData = {
        valor: 0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      await expect(service.processCharge(chargeData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.processCharge(chargeData)).rejects.toThrow(
        'Amount must be positive',
      );
    });
  });

  describe('Stripe Integration', () => {
    let stripeService: PaymentService;
    let _stripeRepo: Repository<Payment>;

    const mockStripeConfigService = {
      get: jest.fn((_key: string) => {
        return 'sk_test_mock_stripe_key';
      }),
    };

    const mockStripe = {
      paymentMethods: {
        create: jest.fn(),
      },
      paymentIntents: {
        create: jest.fn(),
      },
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          {
            provide: getRepositoryToken(Payment),
            useValue: mockRepository,
          },
          {
            provide: ConfigService,
            useValue: mockStripeConfigService,
          },
        ],
      }).compile();

      stripeService = module.get<PaymentService>(PaymentService);
      _stripeRepo = module.get<Repository<Payment>>(
        getRepositoryToken(Payment),
      );

      // Manually set stripe instance for testing
      (stripeService as any).stripe = mockStripe;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should process charge through Stripe successfully', async () => {
      const chargeData = {
        valor: 100.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      mockStripe.paymentMethods.create.mockResolvedValue({
        id: 'pm_test_123',
      });

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      });

      const savedPayment = {
        id: 1,
        valor: 100.0,
        ciclista: 1,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await stripeService.processCharge(chargeData);

      expect(mockStripe.paymentMethods.create).toHaveBeenCalledWith({
        type: 'card',
        card: {
          number: '4532015112830366',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.PAID);
    });

    it('should handle Stripe payment failure', async () => {
      const chargeData = {
        valor: 100.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      // First call (validation) succeeds, second call (processing) fails
      mockStripe.paymentMethods.create
        .mockResolvedValueOnce({ id: 'pm_test' }) // Validation succeeds
        .mockRejectedValueOnce(new Error('Card declined')); // Processing fails

      await expect(stripeService.processCharge(chargeData)).rejects.toThrow(
        'Payment processing failed',
      );
    });

    it('should handle Stripe card validation error with specific error type', async () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '123',
      };

      const stripeError = new Error('Your card was declined');
      (stripeError as any).type = 'StripeCardError';
      (stripeError as any).code = 'card_declined';

      mockStripe.paymentMethods.create.mockRejectedValue(stripeError);

      await expect(stripeService.validateCreditCard(cardData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(stripeService.validateCreditCard(cardData)).rejects.toThrow(
        'Invalid card: Your card was declined',
      );
    });

    it('should handle Stripe payment intent with non-succeeded status', async () => {
      const chargeData = {
        valor: 100.0,
        ciclista: 1,
        cardData: {
          numero: '4532015112830366',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      mockStripe.paymentMethods.create.mockResolvedValue({
        id: 'pm_test_123',
      });

      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        status: 'requires_action', // Non-succeeded status
      });

      const savedPayment = {
        id: 1,
        valor: 100.0,
        ciclista: 1,
        status: PaymentStatus.FAILED,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockRepository.create.mockReturnValue(savedPayment);
      mockRepository.save.mockResolvedValue(savedPayment);

      const result = await stripeService.processCharge(chargeData);

      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });
});
