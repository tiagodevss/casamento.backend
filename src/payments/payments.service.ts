import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentKind, PaymentMethod, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GiftsService } from '../gifts/gifts.service';
import { AbacatePayService } from './abacatepay.service';
import { CreatePaymentOrderDto } from './create-payment-order.dto';

const PIX_EXPIRATION_SECONDS = 30 * 60;
const CARD_MAX_INSTALLMENTS = 12;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gifts: GiftsService,
    private readonly abacatePay: AbacatePayService,
    private readonly config: ConfigService,
  ) {}

  async createOrder(dto: CreatePaymentOrderDto) {
    const method = dto.method ?? PaymentMethod.PIX;
    const paymentDetails = await this.resolvePaymentDetails(dto);
    const { amountCents, description, giftId } = paymentDetails;

    const order = await this.prisma.paymentOrder.create({
      data: {
        kind: dto.kind,
        method,
        amountCents,
        giftId,
        donorName: dto.donorName,
        donorMessage: dto.donorMessage,
        status: PaymentStatus.PENDING,
        expiresAt: new Date(Date.now() + PIX_EXPIRATION_SECONDS * 1000),
      },
    });

    if (method === PaymentMethod.CARD) {
      try {
        const publicAppUrl = this.resolvePublicAppUrl();
        const product = await this.abacatePay.ensureProduct({
          externalId: paymentDetails.checkoutProductExternalId,
          name: paymentDetails.checkoutProductName,
          description: paymentDetails.checkoutProductDescription,
          priceCents: amountCents,
        });
        const checkout = await this.abacatePay.createHostedBilling({
          productId: product.id,
          externalId: order.id,
          returnUrl: `${publicAppUrl}/presentes?payment=cancelled&order=${order.id}`,
          completionUrl: `${publicAppUrl}/presentes?payment=success&order=${order.id}`,
          metadata: { paymentOrderId: order.id },
          maxInstallments: CARD_MAX_INSTALLMENTS,
        });

        return this.prisma.paymentOrder.update({
          where: { id: order.id },
          data: {
            abacateBillingId: checkout.id,
            checkoutUrl: checkout.url,
          },
        });
      } catch (error) {
        await this.markOrderAsFailed(order.id);
        throw error;
      }
    }

    try {
      const pix = await this.abacatePay.createTransparentPix({
        amountCents,
        description,
        expiresInSeconds: PIX_EXPIRATION_SECONDS,
        metadata: { paymentOrderId: order.id },
      });

      return this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          abacateTransparentId: pix.id,
          brCode: pix.brCode,
          brCodeBase64: pix.brCodeBase64,
        },
      });
    } catch (error) {
      await this.markOrderAsFailed(order.id);
      throw error;
    }
  }

  async getStatus(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return { status: order.status, paidAt: order.paidAt };
  }

  private async resolvePaymentDetails(dto: CreatePaymentOrderDto) {
    if (dto.kind === PaymentKind.FIXED_GIFT) {
      if (!dto.giftId) throw new BadRequestException('giftId é obrigatório para presente fixo');
      const gift = await this.gifts.getActiveById(dto.giftId);
      return {
        amountCents: gift.priceCents,
        description: gift.title,
        giftId: gift.id,
        checkoutProductExternalId: `${gift.externalId}-${gift.priceCents}`,
        checkoutProductName: gift.title,
        checkoutProductDescription: gift.description,
      };
    }

    if (!dto.amountCents || dto.amountCents < 500) {
      throw new BadRequestException('Valor mínimo de contribuição é R$ 5,00');
    }
    return {
      amountCents: dto.amountCents,
      description: 'Contribuição livre — Tiago & Gabriela',
      giftId: undefined,
      checkoutProductExternalId: `free-contribution-${dto.amountCents}`,
      checkoutProductName: 'Contribuição livre — Tiago & Gabriela',
      checkoutProductDescription: 'Contribuição livre para os noivos',
    };
  }

  private resolvePublicAppUrl() {
    const explicit = this.config.get<string>('APP_URL')?.trim();
    if (explicit) return explicit.replace(/\/$/, '');

    const firstCorsOrigin = (this.config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .find(Boolean);

    return (firstCorsOrigin ?? 'http://localhost:5173').replace(/\/$/, '');
  }

  private async markOrderAsFailed(orderId: string) {
    await this.prisma.paymentOrder.update({
      where: { id: orderId },
      data: { status: PaymentStatus.FAILED },
    });
  }
}
