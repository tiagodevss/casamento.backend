import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CommunicationDeliveryStatus,
  WhatsAppMessageDirection,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeBrazilPhone, phoneFromWhatsAppId } from './phone.util';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from './whatsapp-provider.interface';

const STOP_WORDS = new Set(['parar', 'sair', 'stop', 'cancelar mensagens']);
const MENU_WORDS = new Set(['oi', 'ola', 'olá', 'menu', 'inicio', 'início', 'ajuda']);

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function extractProviderId(value: unknown): string | undefined {
  const record = asRecord(value);
  if (typeof record.providerMessageId === 'string') return record.providerMessageId;
  if (typeof record.messageId === 'string') return record.messageId;
  if (typeof record.id === 'string') return record.id;
  const id = asRecord(record.id);
  if (typeof id._serialized === 'string') return id._serialized;
  if (typeof id.id === 'string') return id.id;
  const data = asRecord(record.data);
  if (data !== record) return extractProviderId(data);
  return undefined;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProvider,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  status() {
    return this.provider.getStatus();
  }

  connect() {
    return this.provider.startSession();
  }

  qrCode() {
    return this.provider.getQrCode();
  }

  disconnect() {
    return this.provider.disconnect();
  }

  async sendText(phoneInput: string, message: string, guestGroupId?: string) {
    const phone = normalizeBrazilPhone(phoneInput);
    if (!phone) throw new Error('Telefone inválido');
    const result = await this.provider.sendText(phone, message);
    await this.prisma.whatsAppMessage.create({
      data: {
        guestGroupId,
        direction: WhatsAppMessageDirection.OUTBOUND,
        phone,
        body: message,
        providerMessageId: result.providerMessageId,
        eventType: 'manual',
      },
    });
    return result;
  }

  validateWebhookSecret(secret?: string) {
    const expected = this.config.get<string>('WHATSAPP_WEBHOOK_SECRET', '');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Webhook inválido');
    }
  }

  async handleWebhook(payload: unknown) {
    const root = asRecord(payload);
    const event = String(root.event ?? root.type ?? '').toLowerCase();
    const data = asRecord(root.data ?? root);

    if (event.includes('ack') || typeof data.ack === 'number') {
      await this.handleAck(data);
      return { ok: true, handled: 'ack' };
    }

    const from = String(data.from ?? data.chatId ?? '');
    const body = typeof data.body === 'string' ? data.body.trim() : '';
    const isFromMe = Boolean(data.isSentByMe ?? data.fromMe);
    const isGroup = from.includes('@g.us') || Boolean(data.isGroupMsg);

    if (body && from && !isFromMe && !isGroup) {
      await this.handleIncoming(data, event || 'onmessage');
      return { ok: true, handled: 'message' };
    }

    return { ok: true, handled: 'ignored' };
  }

  private async handleAck(data: Record<string, any>) {
    const providerMessageId = extractProviderId(data);
    if (!providerMessageId) return;
    const ack = Number(data.ack ?? data.status ?? 0);
    if (!Number.isFinite(ack) || ack <= 0) return;

    let status = CommunicationDeliveryStatus.SENT;
    const update: Record<string, any> = { status };
    if (ack >= 3) {
      status = CommunicationDeliveryStatus.READ;
      update.status = status;
      update.readAt = new Date();
      update.deliveredAt = new Date();
    } else if (ack >= 2) {
      status = CommunicationDeliveryStatus.DELIVERED;
      update.status = status;
      update.deliveredAt = new Date();
    } else {
      update.sentAt = new Date();
    }

    await this.prisma.communicationDelivery.updateMany({
      where: { providerMessageId },
      data: update,
    });
  }

  private async handleIncoming(data: Record<string, any>, eventType: string) {
    const sender = asRecord(data.sender);
    const phoneCandidates = [
      data.from,
      data.chatId,
      data.author,
      sender.id,
      sender._serialized,
    ];
    const phone = phoneCandidates
      .map((candidate) => phoneFromWhatsAppId(candidate))
      .find(Boolean) ?? null;
    if (!phone) return;
    const body = String(data.body ?? '').trim();
    const normalizedBody = body.toLocaleLowerCase('pt-BR').trim();
    const providerMessageId = extractProviderId(data);

    const guestInclude = {
      members: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
      rsvpResponse: true,
    };
    let guest = await this.prisma.guestGroup.findFirst({
      where: { phoneNormalized: phone },
      include: guestInclude,
    });
    if (!guest) {
      const legacyCandidates = await this.prisma.guestGroup.findMany({
        where: { phone: { not: null } },
        include: guestInclude,
      });
      guest = legacyCandidates.find((candidate) => normalizeBrazilPhone(candidate.phone) === phone) ?? null;
    }

    const needsHuman = normalizedBody === '4';
    try {
      await this.prisma.whatsAppMessage.create({
        data: {
          guestGroupId: guest?.id,
          direction: WhatsAppMessageDirection.INBOUND,
          phone,
          body,
          providerMessageId,
          eventType,
          needsHuman,
        },
      });
    } catch (error: any) {
      if (providerMessageId && String(error?.code) === 'P2002') return;
      throw error;
    }

    if (STOP_WORDS.has(normalizedBody)) {
      if (guest) {
        await this.prisma.guestGroup.update({
          where: { id: guest.id },
          data: { whatsappOptOut: true, whatsappOptOutAt: new Date() },
        });
      }
      await this.sendAutomatedReply(
        phone,
        'Tudo certo. Não enviaremos mais lembretes automáticos por aqui. 💛',
        guest?.id,
        'opt-out',
      );
      return;
    }

    if (!guest) {
      await this.sendAutomatedReply(
        phone,
        'Oi! 💛 Não consegui localizar um convite associado a este número. Se precisar falar com a Gabriela e o Tiago, responda *4*.',
        undefined,
        'unknown-phone',
      );
      return;
    }

    const response = await this.menuResponse(normalizedBody, guest);
    await this.sendAutomatedReply(phone, response.message, guest.id, response.eventType);
  }

  private async menuResponse(
    normalizedBody: string,
    guest: {
      id: string;
      displayName: string;
      invitedToParty: boolean;
      members: { name: string; attending: boolean | null }[];
      rsvpResponse: { partyAttending: boolean | null } | null;
    },
  ) {
    const appUrl = this.config.get<string>('APP_URL', 'https://tiagoegabriela.com.br').replace(/\/$/, '');
    const inviteLink = `${appUrl}/?convite=${guest.id}`;
    const giftLink = `${appUrl}/presentes?convite=${guest.id}`;

    if (normalizedBody === '1') {
      const pending = guest.members.filter((member) => member.attending == null).map((member) => member.name);
      const prefix = pending.length
        ? `Ainda aguardamos a confirmação de: *${pending.join(', ')}*.\n\n`
        : 'Seu convite já está respondido. Se quiser revisar a confirmação, use o link abaixo.\n\n';
      return { eventType: 'menu-rsvp', message: `${prefix}💌 ${inviteLink}` };
    }

    if (normalizedBody === '2') {
      let message =
        '*Cerimônia* 💍\n' +
        '📅 14/11/2026\n' +
        '🕓 16h00\n' +
        '⛪ Igreja Universal Paulínia\n' +
        '📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n' +
        '🗺️ https://www.google.com/maps/search/?api=1&query=Igreja+Universal+Paulínia+Av.+José+Paulino+610+Centro+Paulínia+SP';

      if (guest.invitedToParty && guest.rsvpResponse?.partyAttending === true) {
        message +=
          '\n\n*Recepção* 🥂\n' +
          'Após a cerimônia\n' +
          '📍 Rua Praxiteles F. Neves, 63 - Patropi - Paulínia/SP\n' +
          '🗺️ https://maps.app.goo.gl/xCx15d8vKrzTXubV8';
      }
      return { eventType: 'menu-locations', message };
    }

    if (normalizedBody === '3') {
      return {
        eventType: 'menu-gifts',
        message:
          'Para nós, o mais importante é poder compartilhar esse momento com vocês. 💛\n\n' +
          'Para quem desejar nos presentear, nossa lista está aqui:\n' +
          `🎁 ${giftLink}`,
      };
    }

    if (normalizedBody === '4') {
      return {
        eventType: 'handoff',
        message: 'Certo! 💛 Sua mensagem ficou sinalizada para a Gabriela e o Tiago. Eles poderão continuar o atendimento por aqui.',
      };
    }

    if (MENU_WORDS.has(normalizedBody)) {
      return { eventType: 'menu', message: this.menuText() };
    }

    return {
      eventType: 'fallback-menu',
      message: `Não consegui identificar essa opção automaticamente. 😅\n\n${this.menuText()}`,
    };
  }

  private menuText() {
    return (
      'Oi! 💛 Este é o WhatsApp do casamento da Gabriela e do Tiago.\n\n' +
      'Como podemos ajudar?\n\n' +
      '*1* — Confirmar presença\n' +
      '*2* — Horários e locais\n' +
      '*3* — Lista de presentes\n' +
      '*4* — Falar com a Gabriela e o Tiago\n\n' +
      'Para deixar de receber lembretes automáticos, envie *PARAR*.'
    );
  }

  private async sendAutomatedReply(
    phone: string,
    message: string,
    guestGroupId: string | undefined,
    eventType: string,
  ) {
    try {
      const result = await this.provider.sendText(phone, message);
      await this.prisma.whatsAppMessage.create({
        data: {
          guestGroupId,
          direction: WhatsAppMessageDirection.OUTBOUND,
          phone,
          body: message,
          providerMessageId: result.providerMessageId,
          eventType,
        },
      });
    } catch (error) {
      this.logger.error(`Falha ao responder automaticamente ${phone}: ${String(error)}`);
    }
  }
}
