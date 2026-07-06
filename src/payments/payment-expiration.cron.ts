import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentExpirationCron {
  private readonly logger = new Logger(PaymentExpirationCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStalePendingOrders() {
    const result = await this.prisma.paymentOrder.updateMany({
      where: { status: PaymentStatus.PENDING, expiresAt: { lt: new Date() } },
      data: { status: PaymentStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} pending order(s) as expired`);
    }
  }
}
