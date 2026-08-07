import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './update-settings.dto';

export const INVITE_MESSAGE_TEMPLATE_KEY = 'invite_message_template';

export const DEFAULT_INVITE_MESSAGE_TEMPLATE = `Olá, {{nome}}! 💛
Vocês estão convidados para o nosso casamento.
Confirmem a presença por aqui: {{link}}`;

export const DEFAULT_INVITE_MESSAGE_TEMPLATE_SINGLE = `Olá, {{nome}}! 💛
Você está convidado para o nosso casamento.
Confirme a presença por aqui: {{link}}`;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: INVITE_MESSAGE_TEMPLATE_KEY },
    });

    return {
      inviteMessageTemplate: setting?.value ?? DEFAULT_INVITE_MESSAGE_TEMPLATE,
    };
  }

  async update(dto: UpdateSettingsDto) {
    const value = dto.inviteMessageTemplate.trim();
    await this.prisma.appSetting.upsert({
      where: { key: INVITE_MESSAGE_TEMPLATE_KEY },
      create: { key: INVITE_MESSAGE_TEMPLATE_KEY, value },
      update: { value },
    });

    return { inviteMessageTemplate: value };
  }
}
