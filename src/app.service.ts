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
    // 1. CORREÇÃO DO DELETE:
    // Trocamos .delete({}) por .createQueryBuilder().delete().execute()
    // Isso evita o erro "Empty criteria" e limpa a tabela.
    await this.emailRepo.createQueryBuilder().delete().execute();
    await this.paymentRepo.createQueryBuilder().delete().execute();

    // 2. RESETAR SEQUÊNCIAS (IDs voltarem para 1)
    // Usamos um try/catch caso a sequence tenha nome diferente no banco
    try {
      await this.paymentRepo.query(
        `ALTER SEQUENCE payments_id_seq RESTART WITH 1`,
      );
      await this.emailRepo.query(`ALTER SEQUENCE emails_id_seq RESTART WITH 1`);
    } catch (e) {
      console.log('Aviso: Não foi possível resetar sequencias (pode ser normal em alguns bancos):', e.message);
    }

    // 3. INSERIR DADOS INICIAIS
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
