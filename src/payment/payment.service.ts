import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CardDataDto } from './dto/card-data.dto';
import { ChargeDto } from './dto/charge.dto';

@Injectable()
export class PaymentService {
  private stripe: Stripe | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

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
    // Mock implementation - In production, integrate with payment gateway
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

    // Mock implementation - In production, process each payment through payment gateway
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

  validateCreditCard(cardData: CardDataDto): { valid: boolean } {
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

  async processCharge(chargeData: ChargeDto): Promise<Payment> {
    // Validate amount
    if (!chargeData.valor || chargeData.valor <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Validate card first
    this.validateCreditCard(chargeData.cardData);

    let status = PaymentStatus.PENDING;

    // Process payment through Stripe if configured
    if (this.stripe) {
      try {
        // Parse expiration date (MM/YYYY format)
        const [expMonth, expYear] = chargeData.cardData.validade.split('/');

        // Create a Payment Method
        const paymentMethod = await this.stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: chargeData.cardData.numero,
            exp_month: parseInt(expMonth, 10),
            exp_year: parseInt(expYear, 10),
            cvc: chargeData.cardData.cvv,
          },
        });

        // Create a Payment Intent (amount in cents)
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(chargeData.valor * 100), // Convert to cents
          currency: 'brl',
          payment_method: paymentMethod.id,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
        });

        // Check payment status
        if (paymentIntent.status === 'succeeded') {
          status = PaymentStatus.PAID;
        } else {
          status = PaymentStatus.FAILED;
        }
      } catch (error) {
        // Stripe error - mark payment as failed
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        throw new InternalServerErrorException(
          `Payment processing failed: ${errorMessage}`,
        );
      }
    } else {
      // Fallback: Simulate 90% success rate, 10% failure rate (for testing without Stripe)
      const shouldSucceed = Math.random() >= 0.1;
      status = shouldSucceed ? PaymentStatus.PAID : PaymentStatus.FAILED;
    }

    const payment = this.repo.create({
      valor: chargeData.valor,
      ciclista: chargeData.ciclista,
      status,
    });

    return this.repo.save(payment);
  }
}
