import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
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
    it('should validate credit card', async () => {
      const cardData = {
        numero: '1234567890123456',
        nomeTitular: 'Test User',
        validade: '12/25',
        cvv: '123',
      };

      mockPaymentService.validateCreditCard.mockResolvedValue({ valid: true });

      const result = await controller.validateCreditCard(cardData);

      expect(service.validateCreditCard).toHaveBeenCalledWith(cardData);
      expect(result).toEqual({ valid: true });
    });
  });
});
