import { Test, TestingModule } from '@nestjs/testing';
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
    it('should send an email', async () => {
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
  });
});
