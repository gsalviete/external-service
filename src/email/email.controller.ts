import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('enviarEmail')
export class EmailController {
  constructor(private readonly service: EmailService) {}

  @Post()
  @HttpCode(200)
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto);
  }
}
