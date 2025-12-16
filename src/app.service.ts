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
    await this.paymentRepo.delete({});
    await this.emailRepo.delete({});

    // Reset sequences to start from 1
    await this.paymentRepo.query(
      `ALTER SEQUENCE payments_id_seq RESTART WITH 1`,
    );
    await this.emailRepo.query(`ALTER SEQUENCE emails_id_seq RESTART WITH 1`);

    // Insert initial payment data for testing
    const now = new Date();

    await this.paymentRepo.save({
      status: PaymentStatus.PENDING,
      horaSolicitacao: now,
      horaFinalizacao: now,
      valor: 10,
      ciclista: 3,
    });

    await this.paymentRepo.save({
      status: PaymentStatus.FAILED,
      horaSolicitacao: now,
      horaFinalizacao: now,
      valor: 25.5,
      ciclista: 4,
    });

    return { message: 'Database restored successfully' };
  }
}
