import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('enviarEmail')
export class EmailController {
  constructor(private readonly service: EmailService) {}

  @Post()
  sendEmail(@Body() dto: SendEmailDto) {
    return this.service.sendEmail(dto);
  }
}
