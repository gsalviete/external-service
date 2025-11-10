import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Email } from './email.entity';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(Email)
    private readonly repo: Repository<Email>,
  ) {}

  async sendEmail(dto: SendEmailDto): Promise<Email> {
    // TODO: Implement actual email sending logic
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
