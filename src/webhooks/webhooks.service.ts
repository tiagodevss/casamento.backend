import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AbacateWebhookPayload {
  id?: string;
  event?: string;
  data?: { metadata?: { paymentOrderId?: string } };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processAbacatePayEvent(payload: AbacateWebhookPayload) {
    const providerEventId = payload.id;
    if (!providerEventId) {
      this.logger.warn('Webhook recebido sem id de evento, ignorando');
      return;
    }

    const existing = await this.prisma.webhookEvent.findUnique({ where: { providerEventId } });
    if (existing?.processedAt) {
      this.logger.log(`Evento ${providerEventId} já processado, ignorando reenvio`);
      return;
    }

    const event = existing
      ? existing
      : await this.prisma.webhookEvent.create({
          data: { providerEventId, payload: payload as object },
        });

    if (payload.event === 'transparent.completed') {
      const paymentOrderId = payload.data?.metadata?.paymentOrderId;
      if (paymentOrderId) {
        await this.prisma.paymentOrder.updateMany({
          where: { id: paymentOrderId, status: { not: PaymentStatus.PAID } },
          data: { status: PaymentStatus.PAID, paidAt: new Date() },
        });
      } else {
        this.logger.warn(`Evento ${providerEventId} sem metadata.paymentOrderId`);
      }
    }

    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  }
}
