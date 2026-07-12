import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AbacateWebhookPayload {
  id?: string;
  event?: string;
  data?: Record<string, unknown>;
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

    const paymentOrderId = this.findPaymentOrderId(payload.data);

    if (payload.event === 'transparent.completed' || payload.event === 'checkout.completed' || payload.event === 'billing.paid') {
      if (paymentOrderId) {
        await this.prisma.paymentOrder.updateMany({
          where: { id: paymentOrderId, status: { not: PaymentStatus.PAID } },
          data: { status: PaymentStatus.PAID, paidAt: new Date() },
        });
      } else {
        this.logger.warn(`Evento ${providerEventId} sem metadata.paymentOrderId`);
      }
    }

    if (
      payload.event === 'transparent.refunded' ||
      payload.event === 'checkout.refunded' ||
      payload.event === 'billing.refunded'
    ) {
      if (paymentOrderId) {
        await this.prisma.paymentOrder.updateMany({
          where: { id: paymentOrderId },
          data: { status: PaymentStatus.FAILED },
        });
      }
    }

    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  }

  private findPaymentOrderId(input: unknown): string | undefined {
    if (!input || typeof input !== 'object') return undefined;

    const record = input as Record<string, unknown>;
    const directMetadata = record.metadata;
    if (directMetadata && typeof directMetadata === 'object') {
      const paymentOrderId = (directMetadata as Record<string, unknown>).paymentOrderId;
      if (typeof paymentOrderId === 'string' && paymentOrderId) return paymentOrderId;
    }

    for (const value of Object.values(record)) {
      const nested = this.findPaymentOrderId(value);
      if (nested) return nested;
    }

    return undefined;
  }
}
