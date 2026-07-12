import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { verifyHmacSignature } from './hmac.util';

const SIGNATURE_HEADERS = [
  'x-webhook-signature',
  'x-abacate-signature',
  'x-abacatepay-signature',
] as const;

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
  ) {}

  @Post('abacatepay')
  async handle(@Req() req: Request & { rawBody?: Buffer }, @Body() body: unknown) {
    const secret = this.config.getOrThrow<string>('ABACATEPAY_WEBHOOK_SECRET');
    const providedSecret = Array.isArray(req.query.webhookSecret)
      ? req.query.webhookSecret[0]
      : req.query.webhookSecret;
    const signature = SIGNATURE_HEADERS.map((header) => req.headers[header] as string | undefined).find(Boolean);
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));

    if (providedSecret !== secret) {
      throw new UnauthorizedException('Secret do webhook inválido');
    }

    if (!verifyHmacSignature(rawBody, signature)) {
      throw new UnauthorizedException('Assinatura inválida');
    }

    await this.webhooks.processAbacatePayEvent(body as Parameters<WebhooksService['processAbacatePayEvent']>[0]);
    return { received: true };
  }
}
