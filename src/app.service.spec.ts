import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppService } from './app.service';
import { Payment } from './payment/payment.entity';
import { Email } from './email/email.entity';

describe('AppService', () => {
  let service: AppService;

  const mockPaymentRepository = {
    clear: jest.fn(),
  };

  const mockEmailRepository = {
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Email),
          useValue: mockEmailRepository,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return service name', () => {
      expect(service.getHello()).toBe('External Service - SCB');
    });
  });
});
