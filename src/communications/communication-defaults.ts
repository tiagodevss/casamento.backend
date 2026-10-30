import { CommunicationAudience, CommunicationTemplateScope } from '@prisma/client';

export type DefaultTemplate = {
  key: string;
  name: string;
  description: string;
  bodySingle: string;
  bodyGroup: string;
  scope?: CommunicationTemplateScope;
};

// Plano dos últimos 15 dias (30/10 a 16/11/2026). A festa tem lotação limitada e a entrada
// é por QR Code; só templates PARTY podem citar a festa ou o ingresso.
export const DEFAULT_COMMUNICATION_TEMPLATES: DefaultTemplate[] = [
  {
    key: 'CERIMONIALISTA_INTRO',
    name: 'Apresentação — confirmados',
    description: 'Primeiro contato do número com quem já confirmou: faltam 15 dias e horário da cerimônia.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nEu sou a assistente digital do casamento da Gabriela e do Tiago. 💍\n\nFaltam {{dias_faltando}} dias! Obrigada por confirmar presença com a gente. 🥹\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às 15h00\n⛪ Igreja Universal Paulínia\n📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n🗺️ {{maps_cerimonia}}\n\nAté o grande dia, vou passar por aqui só com o essencial. 😄\n\nSe não quiser receber lembretes automáticos, é só responder *PARAR*.',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nEu sou a assistente digital do casamento da Gabriela e do Tiago. 💍\n\nFaltam {{dias_faltando}} dias! Obrigada por confirmarem presença com a gente. 🥹\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às 15h00\n⛪ Igreja Universal Paulínia\n📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n🗺️ {{maps_cerimonia}}\n\nAté o grande dia, vou passar por aqui só com o essencial. 😄\n\nSe não quiserem receber lembretes automáticos, é só responder *PARAR*.',
  },
  {
    key: 'RSVP_REMINDER_1',
    name: 'Cerimônia — 1º pedido de confirmação',
    description: 'Apresentação e primeiro pedido de confirmação da cerimônia para quem ainda não respondeu.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nEu sou a assistente digital do casamento da Gabriela e do Tiago. 💍\n\nFaltam {{dias_faltando}} dias! A cerimônia será no sábado, 14 de novembro, às *15h00*, na Igreja Universal Paulínia.\n\nAinda não encontramos a sua confirmação. Você consegue confirmar presença na cerimônia? Leva só 1 minutinho:\n\n👉 {{link}}\n\nSe não quiser receber lembretes automáticos, é só responder *PARAR*.',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nEu sou a assistente digital do casamento da Gabriela e do Tiago. 💍\n\nFaltam {{dias_faltando}} dias! A cerimônia será no sábado, 14 de novembro, às *15h00*, na Igreja Universal Paulínia.\n\nAinda aguardamos a confirmação de: *{{pendentes}}*. Vocês conseguem confirmar a presença na cerimônia? Leva só 1 minutinho:\n\n👉 {{link}}\n\nSe não quiserem receber lembretes automáticos, é só responder *PARAR*.',
  },
  {
    key: 'RSVP_REMINDER_2',
    name: 'Cerimônia — 2º pedido de confirmação',
    description: 'Segundo pedido de confirmação da cerimônia para quem continua pendente.',
    bodySingle:
      'Faltam {{dias_faltando}} dias! 🥹💍\n\n{{nome}}, ainda não encontramos a sua confirmação para a cerimônia, no sábado, 14 de novembro, às *15h00*, na Igreja Universal Paulínia.\n\nSe você já souber se conseguirá estar com a gente, é só confirmar aqui:\n\n👉 {{link}}\n\nVai nos ajudar muito. 💛',
    bodyGroup:
      'Faltam {{dias_faltando}} dias! 🥹💍\n\n{{nome}}, ainda aguardamos a confirmação de *{{pendentes}}* para a cerimônia, no sábado, 14 de novembro, às *15h00*, na Igreja Universal Paulínia.\n\nQuando já souberem quem conseguirá estar com a gente, é só confirmar aqui:\n\n👉 {{link}}\n\nVai nos ajudar muito. 💛',
  },
  {
    key: 'RSVP_FINAL',
    name: 'Cerimônia — última chamada',
    description: 'Último pedido de confirmação da cerimônia, na semana do casamento.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nFaltam só {{dias_faltando}} dias e estamos na reta final da organização.\n\nA sua confirmação para a cerimônia (sábado, 14/11, às *15h00*) ainda está pendente. Você consegue confirmar para a gente?\n\n👉 {{link}}\n\nMesmo que infelizmente não consiga comparecer, pode nos avisar pelo próprio link. 😊',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nFaltam só {{dias_faltando}} dias e estamos na reta final da organização.\n\nAinda aguardamos a confirmação de *{{pendentes}}* para a cerimônia (sábado, 14/11, às *15h00*). Vocês conseguem confirmar para a gente?\n\n👉 {{link}}\n\nMesmo que infelizmente alguém não consiga comparecer, pode nos avisar pelo próprio link. 😊',
  },
  {
    key: 'TOMORROW_PENDING',
    name: 'É amanhã — quem ainda não confirmou',
    description: 'Véspera para quem não respondeu: horário, local e último convite para confirmar.',
    bodySingle:
      'É amanhã! 🥹💍\n\n{{nome}}, ainda não recebemos a sua confirmação, mas queremos muito ver você por lá.\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nSe conseguir vir, confirme para a gente aqui:\n\n👉 {{link}} 💛',
    bodyGroup:
      'É amanhã! 🥹💍\n\n{{nome}}, ainda não recebemos a confirmação de *{{pendentes}}*, mas queremos muito ver vocês por lá.\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nSe conseguirem vir, confirmem para a gente aqui:\n\n👉 {{link}} 💛',
  },
  {
    key: 'SITE_GIFTS',
    name: 'Presentes — 1º toque (site, em até 6x)',
    description: 'Apresenta a lista de presentes do site, parcelada em até 6x, sem pressão.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nFaltam {{dias_faltando}} dias!\n\nUma novidade: nossa lista de presentes está no site e dá para parcelar em até *6x*. 🎁\n\nSem pressa e sem obrigação: ter você com a gente já é o nosso maior presente. Mas, se quiser nos mimar, é só escolher:\n\n👉 {{presentes}}',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nFaltam {{dias_faltando}} dias!\n\nUma novidade: nossa lista de presentes está no site e dá para parcelar em até *6x*. 🎁\n\nSem pressa e sem obrigação: ter vocês com a gente já é o nosso maior presente. Mas, se quiserem nos mimar, é só escolher:\n\n👉 {{presentes}}',
  },
  {
    key: 'WEEK_CEREMONY',
    name: 'Falta 1 semana — cerimônia',
    description: 'Lembrete de uma semana com horário e local, mais um lembrete discreto da lista de presentes.',
    bodySingle:
      'Falta só 1 semana. 🥹💍\n\nDepois de tanta preparação, estamos quase lá!\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às *15h00* em ponto\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nTraje social / esporte fino. Salve esta mensagem para consultar no dia. 💛\n\nPS: nossa lista de presentes segue aberta, em até 6x, se você quiser: {{presentes}}',
    bodyGroup:
      'Falta só 1 semana. 🥹💍\n\nDepois de tanta preparação, estamos quase lá!\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às *15h00* em ponto\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nTraje social / esporte fino. Salvem esta mensagem para consultar no dia. 💛\n\nPS: nossa lista de presentes segue aberta, em até 6x, se vocês quiserem: {{presentes}}',
  },
  {
    key: 'WEEK_PARTY',
    scope: CommunicationTemplateScope.PARTY,
    name: 'Falta 1 semana — cerimônia + festa',
    description: 'Lembrete de uma semana para quem confirmou a festa: lotação limitada e aviso do QR Code.',
    bodySingle:
      'Falta só 1 semana. 🥹💍\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às *15h00* em ponto\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\n🥂 Depois da cerimônia, nossa comemoração continua na chácara.\n🗺️ {{maps_festa}}\n\nA festa tem *número limitado de convidados*. Antes do casamento vamos enviar um *QR Code* que vale como a sua entrada. 🎟️\n\nTraje social / esporte fino. Salve esta mensagem para consultar no dia. 💛\n\nPS: nossa lista de presentes segue aberta, em até 6x, se você quiser: {{presentes}}',
    bodyGroup:
      'Falta só 1 semana. 🥹💍\n\n📅 Sábado, 14 de novembro\n🕒 Cerimônia às *15h00* em ponto\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\n🥂 Depois da cerimônia, nossa comemoração continua na chácara.\n🗺️ {{maps_festa}}\n\nA festa tem *número limitado de convidados*. Antes do casamento vamos enviar um *QR Code* que vale como a entrada de vocês. 🎟️\n\nTraje social / esporte fino. Salvem esta mensagem para consultar no dia. 💛\n\nPS: nossa lista de presentes segue aberta, em até 6x, se vocês quiserem: {{presentes}}',
  },
  {
    key: 'GIFT_PIX',
    name: 'Presentes — 3º toque (Pix)',
    description: 'Oferece a chave Pix como alternativa simples, na semana do casamento. Exige GIFT_PIX_KEY.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nFaltam {{dias_faltando}} dias e a contagem regressiva já está batendo forte por aqui. 🥹\n\nSe preferir nos presentear de um jeito mais simples, nossa chave Pix é:\n\n🔑 {{pix}}\n\nÉ totalmente opcional. O que a gente mais quer é ver você lá. 💍',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nFaltam {{dias_faltando}} dias e a contagem regressiva já está batendo forte por aqui. 🥹\n\nSe preferirem nos presentear de um jeito mais simples, nossa chave Pix é:\n\n🔑 {{pix}}\n\nÉ totalmente opcional. O que a gente mais quer é ver vocês lá. 💍',
  },
  {
    key: 'PARTY_TICKET',
    scope: CommunicationTemplateScope.PARTY,
    name: 'QR Code de entrada na festa',
    description: 'Envia o link do ingresso (QR Code) de quem confirmou a festa.',
    bodySingle:
      'Oi, {{nome}}! 🥂💛\n\nFaltam {{dias_faltando}} dias!\n\nComo a nossa festa tem *número limitado de convidados*, a entrada será por QR Code. Este é o seu:\n\n🎟️ {{ingresso}}\n\nAbra o link e mostre o QR Code na entrada da chácara (pode ser um print da tela). Cada QR Code vale uma única entrada. 💍',
    bodyGroup:
      'Oi, {{nome}}! 🥂💛\n\nFaltam {{dias_faltando}} dias!\n\nComo a nossa festa tem *número limitado de convidados*, a entrada será por QR Code. Este é o de vocês (vale para: *{{confirmados}}*):\n\n🎟️ {{ingresso}}\n\nAbram o link e mostrem o QR Code na entrada da chácara (pode ser um print da tela). Cada QR Code vale uma única entrada. 💍',
  },
  {
    key: 'TOMORROW_CEREMONY',
    name: 'É amanhã — cerimônia',
    description: 'Mensagem curta de véspera para quem confirmou apenas a cerimônia.',
    bodySingle:
      'É amanhã! 🥹💍\n\nSó passando para lembrar:\n\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nEstamos muito felizes e esperamos você amanhã. 💛',
    bodyGroup:
      'É amanhã! 🥹💍\n\nSó passando para lembrar:\n\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nEstamos muito felizes e esperamos vocês amanhã. 💛',
  },
  {
    key: 'TODAY_CEREMONY',
    name: 'É hoje — cerimônia',
    description: 'Lembrete na manhã do casamento.',
    bodySingle:
      'É hoje! 💍💛\n\nFinalmente chegou o nosso grande dia!\n\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
    bodyGroup:
      'É hoje! 💍💛\n\nFinalmente chegou o nosso grande dia!\n\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
  },
  {
    key: 'TODAY_PARTY',
    scope: CommunicationTemplateScope.PARTY,
    name: 'É hoje — cerimônia + festa',
    description: 'Lembrete na manhã do casamento para convidados da festa, com o link do QR Code.',
    bodySingle:
      'É hoje! 💍💛\n\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Recepção após a cerimônia\n🗺️ {{maps_festa}}\n\n🎟️ Leve o seu QR Code de entrada na festa: {{ingresso}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
    bodyGroup:
      'É hoje! 💍💛\n\n🕒 Cerimônia às *15h00*\n⛪ Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Recepção após a cerimônia\n🗺️ {{maps_festa}}\n\n🎟️ Levem o QR Code de entrada de vocês na festa: {{ingresso}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
  },
  {
    key: 'THANK_YOU',
    name: 'Agradecimento',
    description: 'Encerramento da jornada após o casamento.',
    bodySingle:
      'Ainda estamos tentando processar tudo o que vivemos. 🥹💛\n\nObrigado por todo carinho e por fazer parte de um momento tão especial para nós.\n\nCada abraço, cada mensagem e cada gesto significaram muito.\n\nCom carinho,\nGabriela & Tiago 💛',
    bodyGroup:
      'Ainda estamos tentando processar tudo o que vivemos. 🥹💛\n\nObrigado por todo carinho e por fazerem parte de um momento tão especial para nós.\n\nCada abraço, cada mensagem e cada gesto significaram muito.\n\nCom carinho,\nGabriela & Tiago 💛',
  },
];

// Templates de planos anteriores que não fazem mais parte da jornada. O script de aplicação do
// plano os desativa (nunca apaga) para que campanhas antigas continuem legíveis no histórico.
export const RETIRED_TEMPLATE_KEYS = ['INFO_CEREMONY', 'INFO_PARTY', 'TOMORROW_PARTY'];

export type DefaultCampaignPlan = {
  name: string;
  templateKey: string;
  audience: CommunicationAudience;
  suggestedAt: string;
  expiresAt: string;
};

// Grupos: pendentes = RSVP_PENDING; só cerimônia = CEREMONY_ONLY_CONFIRMED;
// cerimônia + festa = PARTY_CONFIRMED; todos os confirmados = CONFIRMED.
// Janela de envio do sistema: 09h–20h (America/Sao_Paulo).
export const DEFAULT_CAMPAIGN_PLAN: DefaultCampaignPlan[] = [
  {
    name: 'Apresentação — confirmados',
    templateKey: 'CERIMONIALISTA_INTRO',
    audience: CommunicationAudience.CONFIRMED,
    suggestedAt: '2026-10-30T17:00:00-03:00',
    expiresAt: '2026-10-31T00:00:00-03:00',
  },
  {
    name: 'Cerimônia — 1º pedido de confirmação',
    templateKey: 'RSVP_REMINDER_1',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-10-30T17:30:00-03:00',
    expiresAt: '2026-10-31T00:00:00-03:00',
  },
  {
    name: 'Presentes — 1º toque (site, em até 6x)',
    templateKey: 'SITE_GIFTS',
    audience: CommunicationAudience.CONFIRMED,
    suggestedAt: '2026-11-03T10:00:00-03:00',
    expiresAt: '2026-11-04T00:00:00-03:00',
  },
  {
    name: 'Cerimônia — 2º pedido de confirmação',
    templateKey: 'RSVP_REMINDER_2',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-11-04T10:00:00-03:00',
    expiresAt: '2026-11-05T00:00:00-03:00',
  },
  {
    name: 'Falta 1 semana — cerimônia',
    templateKey: 'WEEK_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-11-07T10:00:00-03:00',
    expiresAt: '2026-11-08T00:00:00-03:00',
  },
  {
    name: 'Falta 1 semana — cerimônia + festa',
    templateKey: 'WEEK_PARTY',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-11-07T10:30:00-03:00',
    expiresAt: '2026-11-08T00:00:00-03:00',
  },
  {
    name: 'Cerimônia — última chamada',
    templateKey: 'RSVP_FINAL',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-11-09T10:00:00-03:00',
    expiresAt: '2026-11-10T00:00:00-03:00',
  },
  {
    name: 'Presentes — 3º toque (Pix)',
    templateKey: 'GIFT_PIX',
    audience: CommunicationAudience.CONFIRMED,
    suggestedAt: '2026-11-11T10:00:00-03:00',
    expiresAt: '2026-11-12T00:00:00-03:00',
  },
  {
    name: 'QR Code de entrada na festa',
    templateKey: 'PARTY_TICKET',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-11-12T10:00:00-03:00',
    expiresAt: '2026-11-13T00:00:00-03:00',
  },
  {
    name: 'É amanhã — cerimônia',
    templateKey: 'TOMORROW_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-11-13T10:00:00-03:00',
    expiresAt: '2026-11-14T00:00:00-03:00',
  },
  {
    name: 'É amanhã — quem ainda não confirmou',
    templateKey: 'TOMORROW_PENDING',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-11-13T11:00:00-03:00',
    expiresAt: '2026-11-14T00:00:00-03:00',
  },
  {
    name: 'É hoje — cerimônia',
    templateKey: 'TODAY_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-11-14T09:00:00-03:00',
    expiresAt: '2026-11-14T13:00:00-03:00',
  },
  {
    name: 'É hoje — cerimônia + festa',
    templateKey: 'TODAY_PARTY',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-11-14T09:30:00-03:00',
    expiresAt: '2026-11-14T13:00:00-03:00',
  },
  {
    name: 'Agradecimento',
    templateKey: 'THANK_YOU',
    audience: CommunicationAudience.CONFIRMED,
    suggestedAt: '2026-11-16T10:00:00-03:00',
    expiresAt: '2026-11-30T23:59:00-03:00',
  },
];
