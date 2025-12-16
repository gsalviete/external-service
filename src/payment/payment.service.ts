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
import { EmailService } from '../email/email.service';

@Injectable()
export class PaymentService {
  private stripe: Stripe | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
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
    // NOSONAR: Math.random() is safe here - used only for simulating payment gateway
    // failure rate (10%) in development/test environment, not for security purposes
    const shouldSucceed = Math.random() >= 0.1; // 90% chance of success
    const status = shouldSucceed ? PaymentStatus.PAID : PaymentStatus.FAILED;

    const payment = this.repo.create({
      ...dto,
      status,
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

    const processedPayments = pendingPayments.map((payment) => {
      // NOSONAR: Math.random() is safe here - used only for simulating payment gateway
      // failure rate (10%) in development/test environment, not for security purposes
      const shouldSucceed = Math.random() >= 0.1; // 90% chance of success
      payment.status = shouldSucceed
        ? PaymentStatus.PAID
        : PaymentStatus.FAILED;
      return payment;
    });

    const savedPayments = await this.repo.save(processedPayments);

    // UC16: Send email notification for each processed payment
    // Note: In production, this would be done via a message queue to avoid blocking
    // and to ensure emails are sent even if the payment processing fails
    for (const payment of savedPayments) {
      try {
        const emailAddress = `ciclista${payment.ciclista}@example.com`;
        let assunto: string;
        let mensagem: string;

        if (payment.status === PaymentStatus.PAID) {
          assunto = 'Cobrança Processada com Sucesso';
          mensagem = `Olá,\n\nSua cobrança de R$ ${payment.valor.toFixed(2)} foi processada com sucesso.\n\nDetalhes:\n- ID da cobrança: ${payment.id}\n- Valor: R$ ${payment.valor.toFixed(2)}\n- Data: ${payment.horaFinalizacao.toLocaleString('pt-BR')}\n\nObrigado por utilizar nosso serviço!`;
        } else {
          assunto = 'Falha no Processamento da Cobrança';
          mensagem = `Olá,\n\nNão foi possível processar sua cobrança de R$ ${payment.valor.toFixed(2)}.\n\nPor favor, verifique os dados do seu cartão de crédito e tente novamente.\n\nDetalhes:\n- ID da cobrança: ${payment.id}\n- Valor: R$ ${payment.valor.toFixed(2)}\n- Status: ${payment.status}\n\nEm caso de dúvidas, entre em contato conosco.`;
        }

        await this.emailService.sendEmail({
          email: emailAddress,
          assunto,
          mensagem,
        });

        console.log(
          `[UC16] Email sent to ${emailAddress} for payment ${payment.id}. Status: ${payment.status}`,
        );
      } catch (error) {
        // Don't fail the entire operation if email fails
        console.error(
          `[UC16] Failed to send email for payment ${payment.id}:`,
          error,
        );
      }
    }

    return savedPayments;
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.repo.findOneBy({ id });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async validateCreditCard(cardData: CardDataDto): Promise<{ valid: boolean }> {
    // OPTION 1: If Stripe PaymentMethod ID is provided, verify it
    if (cardData.paymentMethodId) {
      if (!this.stripe) {
        throw new BadRequestException(
          'Stripe is not configured - cannot validate PaymentMethod',
        );
      }

      try {
        console.log(
          '🔵 [STRIPE] Verifying PaymentMethod:',
          cardData.paymentMethodId,
        );
        // Retrieve the PaymentMethod to verify it exists and is valid
        const paymentMethod = await this.stripe.paymentMethods.retrieve(
          cardData.paymentMethodId,
        );
        console.log('✅ [STRIPE] PaymentMethod valid:', paymentMethod.id);
        return { valid: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('🔴 [STRIPE ERROR]:', message);
        throw new BadRequestException(`Invalid payment method: ${message}`);
      }
    }

    // OPTION 2: Local validation with card details
    // Validate required fields
    if (
      !cardData.numero ||
      !cardData.nomeTitular ||
      !cardData.validade ||
      !cardData.cvv
    ) {
      throw new BadRequestException(
        'Either paymentMethodId or complete card details (numero, nomeTitular, validade, cvv) are required',
      );
    }

    if (cardData.nomeTitular.trim() === '') {
      throw new BadRequestException('Cardholder name is required');
    }

    if (cardData.numero.trim() === '') {
      throw new BadRequestException('Card number is required');
    }

    // Validate expiration date format
    const dateMatch = cardData.validade.match(/^(\d{1,2})\/(\d{4})$/);
    if (!dateMatch) {
      throw new BadRequestException('Invalid expiration date');
    }

    const month = parseInt(dateMatch[1], 10);
    const year = parseInt(dateMatch[2], 10);

    if (month < 1 || month > 12) {
      throw new BadRequestException('Invalid expiration date');
    }

    // Validate card not expired
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new BadRequestException('Card has expired');
    }

    // Fallback: Local validation if Stripe not configured
    // Validate card number using Luhn algorithm
    if (!this.validateLuhn(cardData.numero)) {
      throw new BadRequestException('Invalid card number');
    }

    // Validate CVV format
    const cvvStr = String(cardData.cvv);
    if (!/^\d{3,4}$/.test(cvvStr)) {
      throw new BadRequestException('Invalid CVV');
    }

    // Validate card not expired
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
    await this.validateCreditCard(chargeData.cardData);

    let status = PaymentStatus.PENDING;

    // Process payment through Stripe if configured
    if (this.stripe) {
      // Validate required card data fields
      if (
        !chargeData.cardData.validade ||
        !chargeData.cardData.numero ||
        !chargeData.cardData.cvv
      ) {
        throw new BadRequestException(
          'Complete card details are required for Stripe processing',
        );
      }

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
