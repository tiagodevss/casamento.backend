import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentKind, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GiftsService } from '../gifts/gifts.service';
import { AbacatePayService } from './abacatepay.service';
import { CreatePaymentOrderDto } from './create-payment-order.dto';

const PIX_EXPIRATION_SECONDS = 30 * 60;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gifts: GiftsService,
    private readonly abacatePay: AbacatePayService,
  ) {}

  async createOrder(dto: CreatePaymentOrderDto) {
    const { amountCents, description, giftId } = await this.resolveAmountAndDescription(dto);

    const order = await this.prisma.paymentOrder.create({
      data: {
        kind: dto.kind,
        amountCents,
        giftId,
        donorName: dto.donorName,
        donorMessage: dto.donorMessage,
        status: PaymentStatus.PENDING,
        expiresAt: new Date(Date.now() + PIX_EXPIRATION_SECONDS * 1000),
      },
    });

    const pix = await this.abacatePay.createTransparentPix({
      amountCents,
      description,
      expiresInSeconds: PIX_EXPIRATION_SECONDS,
      metadata: { paymentOrderId: order.id },
    });

    const updated = await this.prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        abacateTransparentId: pix.id,
        brCode: pix.brCode,
        brCodeBase64: pix.brCodeBase64,
      },
    });

    return updated;
  }

  async getStatus(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return { status: order.status, paidAt: order.paidAt };
  }

  private async resolveAmountAndDescription(dto: CreatePaymentOrderDto) {
    if (dto.kind === PaymentKind.FIXED_GIFT) {
      if (!dto.giftId) throw new BadRequestException('giftId é obrigatório para presente fixo');
      const gift = await this.gifts.getActiveById(dto.giftId);
      return { amountCents: gift.priceCents, description: gift.title, giftId: gift.id };
    }

    if (!dto.amountCents || dto.amountCents < 500) {
      throw new BadRequestException('Valor mínimo de contribuição é R$ 5,00');
    }
    return {
      amountCents: dto.amountCents,
      description: 'Contribuição livre — Tiago & Gabriela',
      giftId: undefined,
    };
  }
}
