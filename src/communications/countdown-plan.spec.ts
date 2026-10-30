import {
  CommunicationAudience,
  CommunicationTemplateScope,
} from '@prisma/client';
import {
  DEFAULT_CAMPAIGN_PLAN,
  DEFAULT_COMMUNICATION_TEMPLATES,
  RETIRED_TEMPLATE_KEYS,
} from './communication-defaults';
import { CommunicationsService } from './communications.service';

const KNOWN_VARIABLES = new Set([
  'nome',
  'pessoas',
  'pendentes',
  'confirmados',
  'nao_confirmados',
  'quantidade_pendentes',
  'dias_faltando',
  'link',
  'presentes',
  'site',
  'data_casamento',
  'horario_cerimonia',
  'local_cerimonia',
  'endereco_cerimonia',
  'maps_cerimonia',
  'horario_festa',
  'local_festa',
  'endereco_festa',
  'maps_festa',
  'pix',
  'ingresso',
]);

const templateByKey = new Map(DEFAULT_COMMUNICATION_TEMPLATES.map((item) => [item.key, item]));
const bodyOf = (key: string) => {
  const template = templateByKey.get(key)!;
  return `${template.bodySingle}\n${template.bodyGroup}`;
};

function group(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group-1',
    displayName: 'Família Teste',
    inviteSent: true,
    invitedToParty: false,
    phone: '(19) 99999-9999',
    phoneNormalized: '5519999999999',
    whatsappOptOut: false,
    ticketToken: null,
    members: [{ id: 'member-1', name: 'João', attending: true }],
    rsvpResponse: { partyAttending: null },
    ...overrides,
  } as any;
}

function serviceWith(env: Record<string, unknown> = {}) {
  const config = {
    get: jest.fn((key: string, fallback?: unknown) => (key in env ? env[key] : fallback)),
  };
  return new CommunicationsService({} as any, {} as any, config as any);
}

describe('plano dos últimos 15 dias', () => {
  it('anuncia a cerimônia às 15h em todo template e nunca às 16h', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      const body = `${template.bodySingle}\n${template.bodyGroup}`;
      expect(body).not.toMatch(/16h|16:00/);
      if (body.includes('Cerimônia às')) expect(body).toMatch(/15h00/);
    }
    for (const item of DEFAULT_CAMPAIGN_PLAN) {
      expect(item.expiresAt).not.toMatch(/T16:/);
    }
  });

  it('usa só variáveis que o sistema sabe preencher', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      const body = `${template.bodySingle}\n${template.bodyGroup}`;
      for (const [, name] of body.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)) {
        expect(KNOWN_VARIABLES.has(name)).toBe(true);
      }
    }
  });

  it('só templates PARTY citam a festa, a lotação limitada ou o QR Code', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      const body = `${template.bodySingle}\n${template.bodyGroup}`;
      const mentionsParty = /{{ingresso}}|{{maps_festa}}|número limitado|QR Code|chácara|Recepção/.test(
        body,
      );
      if (mentionsParty) expect(template.scope).toBe(CommunicationTemplateScope.PARTY);
    }
  });

  it('mensagens de quem não confirmou nunca falam da festa e sempre pedem a confirmação', () => {
    const pending = DEFAULT_CAMPAIGN_PLAN.filter(
      (item) => item.audience === CommunicationAudience.RSVP_PENDING,
    );
    expect(pending.map((item) => item.templateKey)).toEqual([
      'RSVP_REMINDER_1',
      'RSVP_REMINDER_2',
      'RSVP_FINAL',
      'TOMORROW_PENDING',
    ]);
    for (const item of pending) {
      const template = templateByKey.get(item.templateKey)!;
      expect(template.scope ?? CommunicationTemplateScope.GENERAL).toBe(
        CommunicationTemplateScope.GENERAL,
      );
      expect(bodyOf(item.templateKey)).toContain('{{link}}');
      expect(bodyOf(item.templateKey)).not.toMatch(/festa|QR|Pix|presente/i);
    }
  });

  it('distribui os 3 toques de presente só para quem já confirmou', () => {
    const gifts = DEFAULT_CAMPAIGN_PLAN.filter((item) =>
      /{{presentes}}|{{pix}}/.test(bodyOf(item.templateKey)),
    );
    expect(gifts.map((item) => item.templateKey)).toEqual([
      'SITE_GIFTS',
      'WEEK_CEREMONY',
      'WEEK_PARTY',
      'GIFT_PIX',
    ]);
    for (const item of gifts) {
      expect(item.audience).not.toBe(CommunicationAudience.RSVP_PENDING);
      expect(item.audience).not.toBe(CommunicationAudience.ALL);
    }
    // Lembretes de dia e hora não levam pedido de presente.
    for (const key of ['TOMORROW_CEREMONY', 'TODAY_CEREMONY', 'TODAY_PARTY', 'PARTY_TICKET']) {
      expect(bodyOf(key)).not.toMatch(/{{presentes}}|{{pix}}|presente/i);
    }
  });

  it('respeita a janela 09h–20h e a ordem cronológica', () => {
    const times = DEFAULT_CAMPAIGN_PLAN.map((item) => new Date(item.suggestedAt));
    for (const time of times) {
      const hour = Number(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          hourCycle: 'h23',
        }).format(time),
      );
      expect(hour).toBeGreaterThanOrEqual(9);
      expect(hour).toBeLessThan(20);
    }
    const sorted = [...times].sort((a, b) => a.getTime() - b.getTime());
    expect(times.map((t) => t.getTime())).toEqual(sorted.map((t) => t.getTime()));
  });

  it('não reaproveita templates aposentados', () => {
    for (const key of RETIRED_TEMPLATE_KEYS) {
      expect(templateByKey.has(key)).toBe(false);
      expect(DEFAULT_CAMPAIGN_PLAN.some((item) => item.templateKey === key)).toBe(false);
    }
  });
});

describe('festa encerrada para novas confirmações', () => {
  const evaluate = (service: CommunicationsService, guest: any, audience: CommunicationAudience) =>
    (service as any).evaluateEligibility(
      guest,
      { audience, includeGuestGroupIds: [], requireInviteSent: true },
      CommunicationTemplateScope.GENERAL,
    );
  const partyUnanswered = () =>
    group({ invitedToParty: true, rsvpResponse: { partyAttending: null } });

  it('com a festa aberta, resposta da festa em branco continua pendente', () => {
    const service = serviceWith({ PARTY_RSVP_OPEN: true });
    expect(evaluate(service, partyUnanswered(), CommunicationAudience.RSVP_PENDING)).toEqual({
      eligible: true,
    });
  });

  it.each([false, 'false'])(
    'com PARTY_RSVP_OPEN=%s, quem confirmou a cerimônia não fica pendente nem fora dos grupos de envio',
    (flag) => {
      const service = serviceWith({ PARTY_RSVP_OPEN: flag });
      expect(evaluate(service, partyUnanswered(), CommunicationAudience.RSVP_PENDING)).toEqual({
        eligible: false,
        reason: 'RSVP_ALREADY_COMPLETED',
      });
      expect(
        evaluate(service, partyUnanswered(), CommunicationAudience.CEREMONY_ONLY_CONFIRMED),
      ).toEqual({ eligible: true });
      expect(evaluate(service, partyUnanswered(), CommunicationAudience.PARTY_CONFIRMED)).toEqual({
        eligible: false,
        reason: 'NOT_PARTY_CONFIRMED',
      });
    },
  );

  it('quem ainda não respondeu a cerimônia segue pendente', () => {
    const service = serviceWith({ PARTY_RSVP_OPEN: false });
    const pending = group({
      invitedToParty: true,
      members: [{ id: 'm', name: 'Ana', attending: null }],
      rsvpResponse: null,
    });
    expect(evaluate(service, pending, CommunicationAudience.RSVP_PENDING)).toEqual({
      eligible: true,
    });
  });

  it('quem já confirmou a festa continua no grupo da festa', () => {
    const service = serviceWith({ PARTY_RSVP_OPEN: false });
    const confirmed = group({ invitedToParty: true, rsvpResponse: { partyAttending: true } });
    expect(evaluate(service, confirmed, CommunicationAudience.PARTY_CONFIRMED)).toEqual({
      eligible: true,
    });
  });
});

describe('variáveis novas das mensagens', () => {
  afterEach(() => jest.useRealTimers());

  const render = (service: CommunicationsService, key: string, guest: any) =>
    (service as any).render(templateByKey.get(key)!, guest) as string;

  it.each([
    ['2026-10-30T09:00:00-03:00', '15'],
    ['2026-11-03T10:00:00-03:00', '11'],
    ['2026-11-13T23:30:00-03:00', '1'],
    ['2026-11-14T09:00:00-03:00', '0'],
    ['2026-11-16T10:00:00-03:00', '0'],
  ])('conta %s como faltando %s dias de calendário', (now, expected) => {
    jest.useFakeTimers().setSystemTime(new Date(now));
    const text = render(serviceWith(), 'SITE_GIFTS', group());
    expect(text).toContain(`Faltam ${expected} dias!`);
  });

  it('preenche a chave Pix e o link do ingresso', () => {
    const service = serviceWith({ GIFT_PIX_KEY: 'casal@exemplo.com', APP_URL: 'https://site.test' });
    expect(render(service, 'GIFT_PIX', group())).toContain('🔑 casal@exemplo.com');

    const withTicket = group({ ticketToken: 'tok_abcdefghijklmnop' });
    expect(render(service, 'PARTY_TICKET', withTicket)).toContain(
      'https://site.test/ingresso/tok_abcdefghijklmnop',
    );
  });

  it('pula o envio em vez de mandar Pix ou ingresso em branco', () => {
    const evaluate = (service: CommunicationsService, guest: any, key: string) =>
      (service as any).evaluateEligibility(
        guest,
        { audience: CommunicationAudience.ALL, includeGuestGroupIds: [], requireInviteSent: true },
        templateByKey.get(key)!.scope,
        bodyOf(key),
      );
    const partyGuest = (extra: Record<string, unknown> = {}) =>
      group({ invitedToParty: true, rsvpResponse: { partyAttending: true }, ...extra });

    expect(evaluate(serviceWith({ GIFT_PIX_KEY: '' }), group(), 'GIFT_PIX')).toEqual({
      eligible: false,
      reason: 'NO_PIX_KEY',
    });
    expect(evaluate(serviceWith({ GIFT_PIX_KEY: 'chave' }), group(), 'GIFT_PIX')).toEqual({
      eligible: true,
    });
    expect(evaluate(serviceWith(), partyGuest(), 'PARTY_TICKET')).toEqual({
      eligible: false,
      reason: 'NO_PARTY_TICKET',
    });
    expect(
      evaluate(serviceWith(), partyGuest({ ticketToken: 'tok_abcdefghijklmnop' }), 'PARTY_TICKET'),
    ).toEqual({ eligible: true });
  });
});
