import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './update-settings.dto';

export const INVITE_MESSAGE_TEMPLATE_KEY = 'invite_message_template';

export const DEFAULT_INVITE_MESSAGE_TEMPLATE = `Querido(a) convidado(a), 🤍
{{nome}}

Nosso grande dia está cada vez mais próximo, e estamos muito felizes por poder compartilhar esse momento tão especial com vocês.

Nosso site do casamento já está disponível! Nele, vocês encontrarão todas as informações sobre a cerimônia e a recepção, poderão confirmar sua presença e, caso desejem nos presentear, também encontrarão nossa lista de presentes.

Pedimos, com carinho, que realizem a confirmação da sua presença até 01/10/2026, para nos ajudar na organização desse dia tão sonhado. ✨

✨ Acesse nosso site:
{{link}}

"Para que todos saibam, compreendam e juntamente considerem que a mão do Senhor fez isso."
Isaías 41:20

Será uma alegria imensa celebrar esse momento ao lado de vocês. Esperamos por vocês! 🤍`;

export const DEFAULT_INVITE_MESSAGE_TEMPLATE_SINGLE = `Querido(a) convidado(a), 🤍
{{nome}}

Nosso grande dia está cada vez mais próximo, e estamos muito felizes por poder compartilhar esse momento tão especial com você.

Nosso site do casamento já está disponível! Nele, você encontrará todas as informações sobre a cerimônia e a recepção, poderá confirmar sua presença e, caso deseje nos presentear, também encontrará nossa lista de presentes.

Pedimos, com carinho, que realize a confirmação da sua presença até 01/10/2026, para nos ajudar na organização desse dia tão sonhado. ✨

✨ Acesse nosso site:
{{link}}

"Para que todos saibam, compreendam e juntamente considerem que a mão do Senhor fez isso."
Isaías 41:20

Será uma alegria imensa celebrar esse momento ao seu lado. Esperamos por você! 🤍`;

const LEGACY_DEFAULT_TEMPLATES = [
  `Querido(a) convidado,🤍
{{nome}}

Nosso grande dia está cada vez mais próximo, e estamos muito felizes por poder compartilhar esse momento tão especial com vocês.

Nosso site do casamento já está disponível! Nele, vocês encontrarão todas as informações sobre a cerimônia e a recepção, além de poderem confirmar sua presença.

Pedimos, com carinho, que realizem a confirmação para nos ajudar na organização desse dia tão sonhado até 01/10/2026✨

✨ Acesse nosso site:
{{link}}

Será uma alegria imensa celebrar esse momento ao lado de pessoas tão especiais. Esperamos por vocês! 🤍`,
  `Querido(a) convidado,🤍
{{nome}}

Nosso grande dia está cada vez mais próximo, e estamos muito felizes por poder compartilhar esse momento tão especial com você.

Nosso site do casamento já está disponível! Nele, você encontrará todas as informações sobre a cerimônia e a recepção, além de poder confirmar sua presença.

Pedimos, com carinho, que realize a confirmação para nos ajudar na organização desse dia tão sonhado até 01/10/2026✨

✨ Acesse nosso site:
{{link}}

Será uma alegria imensa celebrar esse momento ao lado de pessoas tão especiais. Esperamos por você! 🤍`,
];

function resolveStoredTemplate(value?: string | null) {
  const trimmed = (value ?? '').trim();
  if (
    !trimmed ||
    LEGACY_DEFAULT_TEMPLATES.some((legacy) => trimmed === legacy.trim())
  ) {
    return DEFAULT_INVITE_MESSAGE_TEMPLATE;
  }
  return value ?? DEFAULT_INVITE_MESSAGE_TEMPLATE;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: INVITE_MESSAGE_TEMPLATE_KEY },
    });

    return {
      inviteMessageTemplate: resolveStoredTemplate(setting?.value),
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
