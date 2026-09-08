import { Body, Controller, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp/webhook')
@SkipThrottle()
export class WhatsAppWebhookController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Post()
  handle(@Query('secret') secret: string | undefined, @Body() body: unknown) {
    this.whatsapp.validateWebhookSecret(secret);
    return this.whatsapp.handleWebhook(body);
  }
}
