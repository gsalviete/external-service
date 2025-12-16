import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentService } from './payment.service';
import { PaymentController, CardController } from './payment.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), EmailModule],
  controllers: [PaymentController, CardController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
