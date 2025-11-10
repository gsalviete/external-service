import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment, PaymentStatus } from './payment.entity';
import { NotFoundException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let repo: Repository<Payment>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    repo = module.get<Repository<Payment>>(getRepositoryToken(Payment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create and save a payment', async () => {
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
    it('should validate credit card', async () => {
      const cardData = {
        numero: '1234567890123456',
        nomeTitular: 'Test User',
        validade: '12/25',
        cvv: '123',
      };

      const result = await service.validateCreditCard(cardData);

      expect(result).toEqual({ valid: true });
    });
  });
});
