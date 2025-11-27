import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CardDataDto } from './dto/card-data.dto';
import { ChargeDto } from './dto/charge.dto';

@Controller()
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post('cobranca')
  @HttpCode(200)
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Post('filaCobranca')
  @HttpCode(200)
  addToQueue(@Body() dto: CreatePaymentDto) {
    return this.service.addToQueue(dto);
  }

  @Post('processaCobrancasEmFila')
  @HttpCode(200)
  processQueue() {
    return this.service.processQueue();
  }

  @Get('cobranca/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post('validaCartaoDeCredito')
  @HttpCode(200)
  async validateCreditCard(@Body() cardData: CardDataDto) {
    return this.service.validateCreditCard(cardData);
  }
}

@Controller('cartaoDeCredito')
export class CardController {
  constructor(private readonly service: PaymentService) {}

  @Post('validarCartaoDeCredito')
  @HttpCode(200)
  async validateCard(@Body() cardData: CardDataDto) {
    return this.service.validateCreditCard(cardData);
  }

  @Post('realizarCobranca')
  @HttpCode(200)
  async processCharge(@Body() chargeData: ChargeDto) {
    return this.service.processCharge(chargeData);
  }
}
