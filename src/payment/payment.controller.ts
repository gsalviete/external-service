import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller()
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post('cobranca')
  createPayment(@Body() dto: CreatePaymentDto) {
    return this.service.createPayment(dto);
  }

  @Post('filaCobranca')
  addToQueue(@Body() dto: CreatePaymentDto) {
    return this.service.addToQueue(dto);
  }

  @Post('processaCobrancasEmFila')
  processQueue() {
    return this.service.processQueue();
  }

  @Get('cobranca/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post('validaCartaoDeCredito')
  validateCreditCard(@Body() cardData: any) {
    return this.service.validateCreditCard(cardData);
  }
}
