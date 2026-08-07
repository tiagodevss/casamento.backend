import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './update-settings.dto';

export const INVITE_MESSAGE_TEMPLATE_KEY = 'invite_message_template';

export const DEFAULT_INVITE_MESSAGE_TEMPLATE = `Queridos {{nome}},🤍

Nosso grande dia está cada vez mais próximo, e estamos muito felizes por poder compartilhar esse momento tão especial com vocês.

Nosso site do casamento já está disponível! Nele, vocês encontrarão todas as informações sobre a cerimônia e a recepção, além de poderem confirmar sua presença.

Pedimos, com carinho, que realizem a confirmação para nos ajudar na organização desse dia tão sonhado até 01/10/2026✨

✨ Acesse nosso site:
{{link}}

Será uma alegria imensa celebrar esse momento ao lado de pessoas tão especiais. Esperamos por vocês! 🤍`;

export const DEFAULT_INVITE_MESSAGE_TEMPLATE_SINGLE = `Querido(a) {{nome}},🤍

Nosso grande dia está cada vez mais próximo, e estamos muito felizes por poder compartilhar esse momento tão especial com você.

Nosso site do casamento já está disponível! Nele, você encontrará todas as informações sobre a cerimônia e a recepção, além de poder confirmar sua presença.

Pedimos, com carinho, que realize a confirmação para nos ajudar na organização desse dia tão sonhado até 01/10/2026✨

✨ Acesse nosso site:
{{link}}

Será uma alegria imensa celebrar esse momento ao lado de pessoas tão especiais. Esperamos por você! 🤍`;

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
