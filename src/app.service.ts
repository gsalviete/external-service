import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment/payment.entity';
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

    // Insert initial payment data for testing
    const now = new Date();

    await this.paymentRepo.save([
      {
        id: 1,
        status: PaymentStatus.PENDING,
        horaSolicitacao: now,
        horaFinalizacao: now,
        valor: 10,
        ciclista: 3,
      },
      {
        id: 2,
        status: PaymentStatus.FAILED,
        horaSolicitacao: now,
        horaFinalizacao: now,
        valor: 25.5,
        ciclista: 4,
      },
    ]);

    return { message: 'Database restored successfully' };
  }
}
