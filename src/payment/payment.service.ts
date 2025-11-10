import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    // TODO: Implement actual payment processing logic
    const payment = this.repo.create({
      ...dto,
      status: PaymentStatus.PAID,
    });
    return this.repo.save(payment);
  }

  async addToQueue(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.repo.create({
      ...dto,
      status: PaymentStatus.PENDING,
    });
    return this.repo.save(payment);
  }

  async processQueue(): Promise<Payment[]> {
    const pendingPayments = await this.repo.find({
      where: { status: PaymentStatus.PENDING },
    });

    // TODO: Implement actual payment processing logic
    const processedPayments = pendingPayments.map((payment) => {
      payment.status = PaymentStatus.PAID;
      return payment;
    });

    return this.repo.save(processedPayments);
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.repo.findOneBy({ id });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async validateCreditCard(cardData: any): Promise<{ valid: boolean }> {
    // TODO: Implement actual credit card validation logic
    return { valid: true };
  }
}
