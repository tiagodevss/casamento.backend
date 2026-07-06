import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { verifyHmacSignature } from './hmac.util';

// NOTE: AbacatePay's llms.txt only documents that payloads are HMAC-signed with the
// webhook `secret`, without naming the exact signature header. Confirm the real
// header name in the AbacatePay dashboard/docs when registering the webhook and
// update SIGNATURE_HEADER below before going live.
const SIGNATURE_HEADER = 'x-abacatepay-signature';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooks: WebhooksService,
    private readonly config: ConfigService,
  ) {}

  @Post('abacatepay')
  async handle(@Req() req: Request & { rawBody?: Buffer }, @Body() body: unknown) {
    const secret = this.config.getOrThrow<string>('ABACATEPAY_WEBHOOK_SECRET');
    const signature = req.headers[SIGNATURE_HEADER] as string | undefined;
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));

    if (!verifyHmacSignature(rawBody, signature, secret)) {
      throw new UnauthorizedException('Assinatura inválida');
    }

    await this.webhooks.processAbacatePayEvent(body as Parameters<WebhooksService['processAbacatePayEvent']>[0]);
    return { received: true };
  }
}
