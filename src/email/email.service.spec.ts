import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';
import { Email } from './email.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('EmailService', () => {
  let service: EmailService;
  let repo: Repository<Email>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: getRepositoryToken(Email),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    repo = module.get<Repository<Email>>(getRepositoryToken(Email));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should create and save an email', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: 'Test Subject',
        mensagem: 'Test Message',
      };

      const savedEmail = { id: 1, ...dto, createdAt: new Date() };

      mockRepository.create.mockReturnValue(savedEmail);
      mockRepository.save.mockResolvedValue(savedEmail);

      const result = await service.sendEmail(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(savedEmail);
      expect(result).toEqual(savedEmail);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const dto = {
        email: 'invalid-email',
        assunto: 'Test Subject',
        mensagem: 'Test Message',
      };

      await expect(service.sendEmail(dto)).rejects.toThrow(BadRequestException);
      await expect(service.sendEmail(dto)).rejects.toThrow('Invalid email format');
    });

    it('should throw BadRequestException for empty email', async () => {
      const dto = {
        email: '',
        assunto: 'Test Subject',
        mensagem: 'Test Message',
      };

      await expect(service.sendEmail(dto)).rejects.toThrow(BadRequestException);
      await expect(service.sendEmail(dto)).rejects.toThrow('Email is required');
    });

    it('should throw BadRequestException for empty subject', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: '',
        mensagem: 'Test Message',
      };

      await expect(service.sendEmail(dto)).rejects.toThrow(BadRequestException);
      await expect(service.sendEmail(dto)).rejects.toThrow('Subject is required');
    });

    it('should throw BadRequestException for empty message', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: 'Test Subject',
        mensagem: '',
      };

      await expect(service.sendEmail(dto)).rejects.toThrow(BadRequestException);
      await expect(service.sendEmail(dto)).rejects.toThrow('Message is required');
    });

    it('should throw BadRequestException for whitespace-only subject', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: '   ',
        mensagem: 'Test Message',
      };

      await expect(service.sendEmail(dto)).rejects.toThrow(BadRequestException);
      await expect(service.sendEmail(dto)).rejects.toThrow('Subject is required');
    });

    it('should throw BadRequestException for whitespace-only message', async () => {
      const dto = {
        email: 'test@example.com',
        assunto: 'Test Subject',
        mensagem: '   ',
      };

      await expect(service.sendEmail(dto)).rejects.toThrow(BadRequestException);
      await expect(service.sendEmail(dto)).rejects.toThrow('Message is required');
    });
  });

  describe('findAll', () => {
    it('should return an array of emails', async () => {
      const emails = [
        {
          id: 1,
          email: 'test@example.com',
          assunto: 'Test',
          mensagem: 'Message',
          createdAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(emails);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(emails);
    });
  });

  describe('findOne', () => {
    it('should return a single email', async () => {
      const email = {
        id: 1,
        email: 'test@example.com',
        assunto: 'Test',
        mensagem: 'Message',
        createdAt: new Date(),
      };

      mockRepository.findOneBy.mockResolvedValue(email);

      const result = await service.findOne(1);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(email);
    });

    it('should throw NotFoundException when email not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
