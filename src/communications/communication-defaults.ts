import { CommunicationAudience } from '@prisma/client';

export type DefaultTemplate = {
  key: string;
  name: string;
  description: string;
  bodySingle: string;
  bodyGroup: string;
};

export const DEFAULT_COMMUNICATION_TEMPLATES: DefaultTemplate[] = [
  {
    key: 'CERIMONIALISTA_INTRO',
    name: 'Apresentação da cerimonialista',
    description: 'Primeiro contato do novo número, sem cobrança de RSVP.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nEu sou a assistente digital do casamento da Gabriela e do Tiago. 💍\n\nAté o grande dia, vou passar por aqui de vez em quando com informações e lembretes importantes.\n\nPrometo não encher seu WhatsApp. 😄\n\nNos vemos em novembro! 💛\n\nSe não quiser receber lembretes automáticos, é só responder *PARAR*.',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nEu sou a assistente digital do casamento da Gabriela e do Tiago. 💍\n\nAté o grande dia, vou passar por aqui de vez em quando com informações e lembretes importantes para vocês.\n\nPrometo não encher o WhatsApp. 😄\n\nNos vemos em novembro! 💛\n\nSe não quiserem receber lembretes automáticos, é só responder *PARAR*.',
  },
  {
    key: 'RSVP_REMINDER_1',
    name: 'RSVP — 1º lembrete',
    description: 'Primeiro lembrete para convites com confirmação pendente.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nNosso grande dia está chegando e sua confirmação ainda está pendente.\n\nQuando tiver um minutinho, confirma para a gente? Isso ajuda bastante na organização. 🥰\n\n👉 {{link}}',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nNosso grande dia está chegando e ainda aguardamos a confirmação de: *{{pendentes}}*.\n\nQuando puderem, atualizem a confirmação pelo nosso site. Isso ajuda bastante na organização. 🥰\n\n👉 {{link}}',
  },
  {
    key: 'RSVP_REMINDER_2',
    name: 'RSVP — 2º lembrete',
    description: 'Segundo lembrete para quem continua pendente.',
    bodySingle:
      'Faltam {{dias_faltando}} dias! 🥹💍\n\n{{nome}}, ainda não encontramos sua confirmação por aqui.\n\nSe você já souber se conseguirá estar com a gente, pode confirmar aqui:\n\n👉 {{link}}\n\nVai ajudar muito na nossa organização. 💛',
    bodyGroup:
      'Faltam {{dias_faltando}} dias! 🥹💍\n\n{{nome}}, ainda aguardamos a confirmação de: *{{pendentes}}*.\n\nQuando já souberem quem conseguirá estar com a gente, podem atualizar aqui:\n\n👉 {{link}}\n\nVai ajudar muito na nossa organização. 💛',
  },
  {
    key: 'RSVP_FINAL',
    name: 'RSVP — última chamada',
    description: 'Último lembrete automático antes do fechamento da lista.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nEstamos entrando na reta final da organização e precisamos fechar a quantidade de convidados. Sua confirmação ainda está pendente.\n\nVocê consegue confirmar para a gente?\n\n👉 {{link}}\n\nMesmo que infelizmente não consiga comparecer, pode informar pelo próprio link. 😊',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nEstamos entrando na reta final da organização e precisamos fechar a quantidade de convidados. Ainda aguardamos a confirmação de: *{{pendentes}}*.\n\nVocês conseguem atualizar para a gente?\n\n👉 {{link}}\n\nMesmo que alguém infelizmente não consiga comparecer, pode informar pelo próprio link. 😊',
  },
  {
    key: 'SITE_GIFTS',
    name: 'Site e lista de presentes',
    description: 'Divulga novamente o site; a lista aparece apenas como informação opcional.',
    bodySingle:
      'Oi, {{nome}}! 💛\n\nFalta só 1 mês para o nosso grande dia!\n\nNo nosso site estão reunidas as principais informações do casamento e, para quem desejar nos presentear, também deixamos nossa lista de presentes por lá. 🎁\n\nPara nós, o mais importante é poder compartilhar esse momento com você.\n\n✨ {{site}}',
    bodyGroup:
      'Oi, {{nome}}! 💛\n\nFalta só 1 mês para o nosso grande dia!\n\nNo nosso site estão reunidas as principais informações do casamento e, para quem desejar nos presentear, também deixamos nossa lista de presentes por lá. 🎁\n\nPara nós, o mais importante é poder compartilhar esse momento com vocês.\n\n✨ {{site}}',
  },
  {
    key: 'INFO_CEREMONY',
    name: 'Informações finais — cerimônia',
    description: 'Informações práticas para convidados somente da cerimônia.',
    bodySingle:
      'O grande dia está chegando! 💍\n\nAlgumas informações para você se programar:\n\n📅 14 de novembro\n🕓 Cerimônia às 16h00\n⛪ Igreja Universal Paulínia\n📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n🗺️ {{maps_cerimonia}}\n\nSe puder, recomendamos chegar alguns minutos antes para se acomodar tranquilamente. 💛',
    bodyGroup:
      'O grande dia está chegando! 💍\n\nAlgumas informações para vocês se programarem:\n\n📅 14 de novembro\n🕓 Cerimônia às 16h00\n⛪ Igreja Universal Paulínia\n📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n🗺️ {{maps_cerimonia}}\n\nSe puderem, recomendamos chegar alguns minutos antes para se acomodarem tranquilamente. 💛',
  },
  {
    key: 'INFO_PARTY',
    name: 'Informações finais — cerimônia + festa',
    description: 'Informações práticas apenas para quem confirmou a recepção.',
    bodySingle:
      'O grande dia está chegando! 💍\n\n⛪ *Cerimônia*\n🕓 16h00\n📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n🗺️ {{maps_cerimonia}}\n\n🥂 *Recepção*\nApós a cerimônia\n📍 Rua Praxiteles F. Neves, 63 - Patropi - Paulínia/SP\n🗺️ {{maps_festa}}\n\nEstamos muito felizes em poder viver esse momento com você. 💛',
    bodyGroup:
      'O grande dia está chegando! 💍\n\n⛪ *Cerimônia*\n🕓 16h00\n📍 Av. José Paulino, 610 — Centro, Paulínia / SP\n🗺️ {{maps_cerimonia}}\n\n🥂 *Recepção*\nApós a cerimônia\n📍 Rua Praxiteles F. Neves, 63 - Patropi - Paulínia/SP\n🗺️ {{maps_festa}}\n\nEstamos muito felizes em poder viver esse momento com vocês. 💛',
  },
  {
    key: 'WEEK_CEREMONY',
    name: 'Falta 1 semana — cerimônia',
    description: 'Lembrete de uma semana para confirmação somente da cerimônia.',
    bodySingle:
      'Falta só 1 semana. 🥹💍\n\nDepois de tanta preparação, estamos quase lá!\n\n📅 14 de novembro\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nSalve esta mensagem para consultar no dia. 💛',
    bodyGroup:
      'Falta só 1 semana. 🥹💍\n\nDepois de tanta preparação, estamos quase lá!\n\n📅 14 de novembro\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nSalvem esta mensagem para consultar no dia. 💛',
  },
  {
    key: 'WEEK_PARTY',
    name: 'Falta 1 semana — cerimônia + festa',
    description: 'Lembrete de uma semana para convidados da recepção.',
    bodySingle:
      'Falta só 1 semana. 🥹💍\n\n📅 14 de novembro\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Depois da cerimônia, nossa comemoração continua na chácara.\n🗺️ {{maps_festa}}\n\nSalve esta mensagem para consultar no dia. 💛',
    bodyGroup:
      'Falta só 1 semana. 🥹💍\n\n📅 14 de novembro\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Depois da cerimônia, nossa comemoração continua na chácara.\n🗺️ {{maps_festa}}\n\nSalvem esta mensagem para consultar no dia. 💛',
  },
  {
    key: 'TOMORROW_CEREMONY',
    name: 'É amanhã — cerimônia',
    description: 'Mensagem curta de véspera para quem confirmou apenas a cerimônia.',
    bodySingle:
      'É amanhã! 🥹💍\n\nSó passando para lembrar:\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nSe puder, chegue com alguns minutos de antecedência. Estamos muito felizes e esperamos você amanhã. 💛',
    bodyGroup:
      'É amanhã! 🥹💍\n\nSó passando para lembrar:\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nSe puderem, cheguem com alguns minutos de antecedência. Estamos muito felizes e esperamos vocês amanhã. 💛',
  },
  {
    key: 'TOMORROW_PARTY',
    name: 'É amanhã — cerimônia + festa',
    description: 'Mensagem curta de véspera para quem confirmou a recepção.',
    bodySingle:
      'É amanhã! 🥹💍\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Recepção após a cerimônia\n📍 Rua Praxiteles F. Neves, 63 - Patropi - Paulínia/SP\n🗺️ {{maps_festa}}\n\nEstamos muito felizes e esperamos você amanhã. 💛',
    bodyGroup:
      'É amanhã! 🥹💍\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Recepção após a cerimônia\n📍 Rua Praxiteles F. Neves, 63 - Patropi - Paulínia/SP\n🗺️ {{maps_festa}}\n\nEstamos muito felizes e esperamos vocês amanhã. 💛',
  },
  {
    key: 'TODAY_CEREMONY',
    name: 'É hoje — cerimônia',
    description: 'Lembrete na manhã do casamento.',
    bodySingle:
      'É hoje! 💍💛\n\nFinalmente chegou o nosso grande dia!\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
    bodyGroup:
      'É hoje! 💍💛\n\nFinalmente chegou o nosso grande dia!\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia — Av. José Paulino, 610\n🗺️ {{maps_cerimonia}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
  },
  {
    key: 'TODAY_PARTY',
    name: 'É hoje — cerimônia + festa',
    description: 'Lembrete na manhã do casamento para convidados da festa.',
    bodySingle:
      'É hoje! 💍💛\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Recepção após a cerimônia\n🗺️ {{maps_festa}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
    bodyGroup:
      'É hoje! 💍💛\n\n🕓 Cerimônia às 16h00\n📍 Igreja Universal Paulínia\n🗺️ {{maps_cerimonia}}\n\n🥂 Recepção após a cerimônia\n🗺️ {{maps_festa}}\n\nBoa viagem e até já!\n\nGabriela & Tiago',
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

export type DefaultCampaignPlan = {
  name: string;
  templateKey: string;
  audience: CommunicationAudience;
  suggestedAt: string;
};

export const DEFAULT_CAMPAIGN_PLAN: DefaultCampaignPlan[] = [
  {
    name: 'Apresentação da cerimonialista',
    templateKey: 'CERIMONIALISTA_INTRO',
    audience: CommunicationAudience.ALL,
    suggestedAt: '2026-09-08T19:00:00-03:00',
  },
  {
    name: 'RSVP — 1º lembrete',
    templateKey: 'RSVP_REMINDER_1',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-09-15T10:00:00-03:00',
  },
  {
    name: 'RSVP — 2º lembrete',
    templateKey: 'RSVP_REMINDER_2',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-09-23T10:00:00-03:00',
  },
  {
    name: 'RSVP — última chamada',
    templateKey: 'RSVP_FINAL',
    audience: CommunicationAudience.RSVP_PENDING,
    suggestedAt: '2026-09-30T10:00:00-03:00',
  },
  {
    name: 'Site e lista de presentes',
    templateKey: 'SITE_GIFTS',
    audience: CommunicationAudience.CONFIRMED,
    suggestedAt: '2026-10-15T10:00:00-03:00',
  },
  {
    name: 'Informações finais — cerimônia',
    templateKey: 'INFO_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-10-31T10:00:00-03:00',
  },
  {
    name: 'Informações finais — cerimônia + festa',
    templateKey: 'INFO_PARTY',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-10-31T10:30:00-03:00',
  },
  {
    name: 'Falta 1 semana — cerimônia',
    templateKey: 'WEEK_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-11-07T10:00:00-03:00',
  },
  {
    name: 'Falta 1 semana — cerimônia + festa',
    templateKey: 'WEEK_PARTY',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-11-07T10:30:00-03:00',
  },
  {
    name: 'É amanhã — cerimônia',
    templateKey: 'TOMORROW_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-11-13T10:00:00-03:00',
  },
  {
    name: 'É amanhã — cerimônia + festa',
    templateKey: 'TOMORROW_PARTY',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-11-13T10:30:00-03:00',
  },
  {
    name: 'É hoje — cerimônia',
    templateKey: 'TODAY_CEREMONY',
    audience: CommunicationAudience.CEREMONY_ONLY_CONFIRMED,
    suggestedAt: '2026-11-14T09:00:00-03:00',
  },
  {
    name: 'É hoje — cerimônia + festa',
    templateKey: 'TODAY_PARTY',
    audience: CommunicationAudience.PARTY_CONFIRMED,
    suggestedAt: '2026-11-14T09:30:00-03:00',
  },
  {
    name: 'Agradecimento',
    templateKey: 'THANK_YOU',
    audience: CommunicationAudience.CONFIRMED,
    suggestedAt: '2026-11-16T10:00:00-03:00',
  },
];
