import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment/payment.entity';
import { Email } from './email/email.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
  ) {}

  getHello(): string {
    return 'External Service - SCB';
  }

  async restaurarDados(): Promise<{ message: string }> {
    // Clear all tables
    await this.paymentRepo.clear();
    await this.emailRepo.clear();

    // No initial data needed for external service according to documentation
    // Payment and email records will be created as needed by other services

    return { message: 'Database restored successfully' };
  }
}
