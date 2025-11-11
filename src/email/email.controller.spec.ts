import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

describe('EmailController', () => {
  let controller: EmailController;
  let service: EmailService;

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: 'Test Subject',
        mensagem: 'Test Message',
      };

      const savedEmail = { id: 1, ...dto, createdAt: new Date() };

      mockEmailService.sendEmail.mockResolvedValue(savedEmail);

      const result = await controller.sendEmail(dto);

      expect(service.sendEmail).toHaveBeenCalledWith(dto);
      expect(result).toEqual(savedEmail);
    });

    it('should propagate service errors', async () => {
      const dto = {
        email: 'invalid-email',
        assunto: 'Test Subject',
        mensagem: 'Test Message',
      };

      mockEmailService.sendEmail.mockRejectedValue(
        new BadRequestException('Invalid email format'),
      );

      await expect(controller.sendEmail(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.sendEmail(dto)).rejects.toThrow(
        'Invalid email format',
      );
    });

    it('should handle empty email error', async () => {
      const dto = {
        email: '',
        assunto: 'Test Subject',
        mensagem: 'Test Message',
      };

      mockEmailService.sendEmail.mockRejectedValue(
        new BadRequestException('Email is required'),
      );

      await expect(controller.sendEmail(dto)).rejects.toThrow(
        'Email is required',
      );
    });

    it('should handle empty subject error', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: '',
        mensagem: 'Test Message',
      };

      mockEmailService.sendEmail.mockRejectedValue(
        new BadRequestException('Subject is required'),
      );

      await expect(controller.sendEmail(dto)).rejects.toThrow(
        'Subject is required',
      );
    });

    it('should handle empty message error', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: 'Test Subject',
        mensagem: '',
      };

      mockEmailService.sendEmail.mockRejectedValue(
        new BadRequestException('Message is required'),
      );

      await expect(controller.sendEmail(dto)).rejects.toThrow(
        'Message is required',
      );
    });
  });
});
