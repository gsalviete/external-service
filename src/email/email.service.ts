import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { Email } from './email.entity';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private mailerSend: MailerSend | null = null;
  private fromEmail: string | null = null;
  private fromName: string | null = null;

  constructor(
    @InjectRepository(Email)
    private readonly repo: Repository<Email>,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('MAILERSEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('MAILERSEND_FROM_EMAIL') || null;
    this.fromName =
      this.configService.get<string>('MAILERSEND_FROM_NAME') || null;

    if (apiKey) {
      this.mailerSend = new MailerSend({ apiKey });
    }
  }

  async sendEmail(dto: SendEmailDto): Promise<Email> {
    // Validate email
    if (!dto.email || dto.email.trim() === '') {
      throw new BadRequestException('Email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate subject
    if (!dto.assunto || dto.assunto.trim() === '') {
      throw new BadRequestException('Subject is required');
    }

    // Validate message
    if (!dto.mensagem || dto.mensagem.trim() === '') {
      throw new BadRequestException('Message is required');
    }

    // Send email via MailerSend
    if (this.mailerSend && this.fromEmail) {
      try {
        const sentFrom = new Sender(this.fromEmail, this.fromName ?? undefined);
        const recipients = [new Recipient(dto.email, dto.email)];

        const emailParams = new EmailParams()
          .setFrom(sentFrom)
          .setTo(recipients)
          .setSubject(dto.assunto)
          .setText(dto.mensagem);

        await this.mailerSend.email.send(emailParams);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new InternalServerErrorException(
          `Failed to send email: ${errorMessage}`,
        );
      }
    }

    // Save email record to database
    const email = this.repo.create(dto);
    return this.repo.save(email);
  }

  async findAll(): Promise<Email[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<Email> {
    const email = await this.repo.findOneBy({ id });
    if (!email) {
      throw new NotFoundException('Email not found');
    }
    return email;
  }
}
