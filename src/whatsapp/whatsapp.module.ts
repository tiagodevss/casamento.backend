import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WppConnectProvider } from './providers/wppconnect.provider';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WHATSAPP_PROVIDER } from './whatsapp-provider.interface';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [
    WppConnectProvider,
    { provide: WHATSAPP_PROVIDER, useExisting: WppConnectProvider },
    WhatsAppService,
  ],
  exports: [WHATSAPP_PROVIDER, WhatsAppService],
})
export class WhatsAppModule {}
