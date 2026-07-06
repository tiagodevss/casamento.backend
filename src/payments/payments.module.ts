import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GiftsModule } from '../gifts/gifts.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AbacatePayService } from './abacatepay.service';
import { PaymentExpirationCron } from './payment-expiration.cron';

@Module({
  imports: [HttpModule, GiftsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, AbacatePayService, PaymentExpirationCron],
  exports: [AbacatePayService],
})
export class PaymentsModule {}
