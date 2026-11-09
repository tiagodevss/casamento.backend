import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WppConnectProvider } from './providers/wppconnect.provider';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';
import { WHATSAPP_PROVIDER } from './whatsapp-provider.interface';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppSessionWatchdog } from './whatsapp-session.watchdog';

@Module({
  imports: [HttpModule, PrismaModule, AuthModule],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [
    WppConnectProvider,
    { provide: WHATSAPP_PROVIDER, useExisting: WppConnectProvider },
    WhatsAppSessionWatchdog,
    WhatsAppService,
  ],
  exports: [WHATSAPP_PROVIDER, WhatsAppService],
})
export class WhatsAppModule {}
