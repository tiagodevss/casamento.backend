import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { CreatePaymentOrderDto } from './create-payment-order.dto';

@Controller('payments/orders')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  create(@Body() dto: CreatePaymentOrderDto) {
    return this.payments.createOrder(dto);
  }

  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.payments.getStatus(id);
  }
}
