import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Payment } from './payment/payment.entity';
import { Email } from './email/email.entity';

describe('AppController', () => {
  let appController: AppController;

  const mockPaymentRepository = {
    clear: jest.fn(),
  };

  const mockEmailRepository = {
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
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

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return service name', () => {
      expect(appController.getHello()).toBe('External Service - SCB');
    });
  });
});
