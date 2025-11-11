import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentController, CardController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentStatus } from './payment.entity';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentService = {
    createPayment: jest.fn(),
    addToQueue: jest.fn(),
    processQueue: jest.fn(),
    findOne: jest.fn(),
    validateCreditCard: jest.fn(),
    processCharge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a payment', async () => {
      const dto = {
        valor: 10.0,
        ciclista: 1,
      };

      const payment = {
        id: 1,
        ...dto,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockPaymentService.createPayment.mockResolvedValue(payment);

      const result = await controller.createPayment(dto);

      expect(service.createPayment).toHaveBeenCalledWith(dto);
      expect(result).toEqual(payment);
    });
  });

  describe('addToQueue', () => {
    it('should add payment to queue', async () => {
      const dto = {
        valor: 5.0,
        ciclista: 2,
      };

      const payment = {
        id: 2,
        ...dto,
        status: PaymentStatus.PENDING,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockPaymentService.addToQueue.mockResolvedValue(payment);

      const result = await controller.addToQueue(dto);

      expect(service.addToQueue).toHaveBeenCalledWith(dto);
      expect(result).toEqual(payment);
    });
  });

  describe('processQueue', () => {
    it('should process queue', async () => {
      const payments = [
        {
          id: 1,
          valor: 10,
          ciclista: 1,
          status: PaymentStatus.PAID,
          horaSolicitacao: new Date(),
          horaFinalizacao: new Date(),
        },
      ];

      mockPaymentService.processQueue.mockResolvedValue(payments);

      const result = await controller.processQueue();

      expect(service.processQueue).toHaveBeenCalled();
      expect(result).toEqual(payments);
    });
  });

  describe('findOne', () => {
    it('should find a payment', async () => {
      const payment = {
        id: 1,
        valor: 10,
        ciclista: 1,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockPaymentService.findOne.mockResolvedValue(payment);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(payment);
    });
  });

  describe('validateCreditCard', () => {
    it('should validate credit card', () => {
      const cardData = {
        numero: '1234567890123456',
        nomeTitular: 'Test User',
        validade: '12/25',
        cvv: '123',
      };

      mockPaymentService.validateCreditCard.mockReturnValue({ valid: true });

      const result = controller.validateCreditCard(cardData);

      expect(service.validateCreditCard).toHaveBeenCalledWith(cardData);
      expect(result).toEqual({ valid: true });
    });
  });
});

describe('CardController', () => {
  let controller: CardController;
  let service: PaymentService;

  const mockPaymentService = {
    validateCreditCard: jest.fn(),
    processCharge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    }).compile();

    controller = module.get<CardController>(CardController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /cartaoDeCredito/validarCartaoDeCredito', () => {
    it('should validate valid credit card successfully', () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '123',
      };

      mockPaymentService.validateCreditCard.mockReturnValue({ valid: true });

      const result = controller.validateCard(cardData);

      expect(service.validateCreditCard).toHaveBeenCalledWith(cardData);
      expect(result).toEqual({ valid: true });
    });

    it('should propagate validation errors', () => {
      const cardData = {
        numero: '1234567890123456',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '123',
      };

      mockPaymentService.validateCreditCard.mockImplementation(() => {
        throw new BadRequestException('Invalid card number');
      });

      expect(() => controller.validateCard(cardData)).toThrow(
        BadRequestException,
      );
      expect(() => controller.validateCard(cardData)).toThrow(
        'Invalid card number',
      );
    });

    it('should handle expired card error', () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2020',
        cvv: '123',
      };

      mockPaymentService.validateCreditCard.mockImplementation(() => {
        throw new BadRequestException('Card has expired');
      });

      expect(() => controller.validateCard(cardData)).toThrow(
        'Card has expired',
      );
    });

    it('should handle invalid CVV error', () => {
      const cardData = {
        numero: '4532015112830366',
        nomeTitular: 'Test User',
        validade: '12/2025',
        cvv: '12',
      };

      mockPaymentService.validateCreditCard.mockImplementation(() => {
        throw new BadRequestException('Invalid CVV');
      });

      expect(() => controller.validateCard(cardData)).toThrow('Invalid CVV');
    });
  });

  describe('POST /cartaoDeCredito/realizarCobranca', () => {
    it('should process charge successfully', async () => {
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

      const payment = {
        id: 1,
        valor: 50.0,
        ciclista: 1,
        status: PaymentStatus.PAID,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockPaymentService.processCharge.mockResolvedValue(payment);

      const result = await controller.processCharge(chargeData);

      expect(service.processCharge).toHaveBeenCalledWith(chargeData);
      expect(result.status).toBe(PaymentStatus.PAID);
      expect(result.valor).toBe(50.0);
    });

    it('should handle invalid card error', async () => {
      const chargeData = {
        valor: 50.0,
        ciclista: 1,
        cardData: {
          numero: '1234567890123456',
          nomeTitular: 'Test User',
          validade: '12/2025',
          cvv: '123',
        },
      };

      mockPaymentService.processCharge.mockRejectedValue(
        new BadRequestException('Invalid card number'),
      );

      await expect(controller.processCharge(chargeData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.processCharge(chargeData)).rejects.toThrow(
        'Invalid card number',
      );
    });

    it('should handle invalid amount error', async () => {
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

      mockPaymentService.processCharge.mockRejectedValue(
        new BadRequestException('Amount must be positive'),
      );

      await expect(controller.processCharge(chargeData)).rejects.toThrow(
        'Amount must be positive',
      );
    });

    it('should handle payment failure (10% failure rate)', async () => {
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

      const payment = {
        id: 1,
        valor: 50.0,
        ciclista: 1,
        status: PaymentStatus.FAILED,
        horaSolicitacao: new Date(),
        horaFinalizacao: new Date(),
      };

      mockPaymentService.processCharge.mockResolvedValue(payment);

      const result = await controller.processCharge(chargeData);

      expect(result.status).toBe(PaymentStatus.FAILED);
    });

    it('should handle zero amount error', async () => {
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

      mockPaymentService.processCharge.mockRejectedValue(
        new BadRequestException('Amount must be positive'),
      );

      await expect(controller.processCharge(chargeData)).rejects.toThrow(
        'Amount must be positive',
      );
    });
  });
});
