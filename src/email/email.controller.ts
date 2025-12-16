import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller()
export class EmailController {
  constructor(private readonly service: EmailService) {}

  @Post('enviarEmail')
  @HttpCode(200)
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto);
  }
}
