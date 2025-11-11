import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * Luhn algorithm to validate credit card numbers
   */
  private validateLuhn(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate expiration date
   */
  private validateExpirationDate(validade: string): boolean {
    const match = validade.match(/^(\d{1,2})\/(\d{4})$/);
    if (!match) {
      return false;
    }

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10);

    if (month < 1 || month > 12) {
      return false;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false;
    }

    return true;
  }

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
    // Validate cardholder name
    if (!cardData.nomeTitular || cardData.nomeTitular.trim() === '') {
      throw new BadRequestException('Cardholder name is required');
    }

    // Validate card number
    if (!cardData.numero || cardData.numero.trim() === '') {
      throw new BadRequestException('Card number is required');
    }

    // Validate card number using Luhn algorithm
    if (!this.validateLuhn(cardData.numero)) {
      throw new BadRequestException('Invalid card number');
    }

    // Validate CVV
    if (!cardData.cvv) {
      throw new BadRequestException('Invalid CVV');
    }

    const cvvStr = String(cardData.cvv);
    if (!/^\d{3,4}$/.test(cvvStr)) {
      throw new BadRequestException('Invalid CVV');
    }

    // Validate expiration date format first
    const dateMatch = cardData.validade.match(/^(\d{1,2})\/(\d{4})$/);
    if (!dateMatch) {
      throw new BadRequestException('Invalid expiration date');
    }

    const month = parseInt(dateMatch[1], 10);
    if (month < 1 || month > 12) {
      throw new BadRequestException('Invalid expiration date');
    }

    // Then validate expiry
    if (!this.validateExpirationDate(cardData.validade)) {
      throw new BadRequestException('Card has expired');
    }

    return { valid: true };
  }

  async processCharge(chargeData: any): Promise<Payment> {
    // Validate amount
    if (!chargeData.valor || chargeData.valor <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Validate card first
    await this.validateCreditCard(chargeData.cardData);

    // Simulate 90% success rate, 10% failure rate
    const shouldSucceed = Math.random() >= 0.1;

    const payment = this.repo.create({
      valor: chargeData.valor,
      ciclista: chargeData.ciclista,
      status: shouldSucceed ? PaymentStatus.PAID : PaymentStatus.FAILED,
    });

    return this.repo.save(payment);
  }
}
