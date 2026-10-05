import {
  CommunicationAudience,
  CommunicationCampaignStatus,
  CommunicationDeliveryStatus,
} from '@prisma/client';
import { CommunicationsService } from './communications.service';
import { WhatsAppAmbiguousSendError } from '../whatsapp/whatsapp-provider.interface';

function group(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group-1',
    displayName: 'Família Teste',
    searchNames: [],
    side: 'BOTH',
    inviteSent: true,
    invitedToParty: false,
    phone: '(19) 99999-9999',
    phoneNormalized: '5519999999999',
    whatsappOptOut: false,
    whatsappOptOutAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        id: 'member-1',
        name: 'João',
        isChild: false,
        attending: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        guestGroupId: 'group-1',
      },
    ],
    rsvpResponse: {
      id: 'rsvp-1',
      guestGroupId: 'group-1',
      partyAttending: null,
      diet: null,
      message: null,
      respondedIp: null,
      respondedAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  } as any;
}

function campaign(audience: CommunicationAudience) {
  return { audience, includeGuestGroupIds: [], requireInviteSent: true } as any;
}

describe('CommunicationsService eligibility', () => {
  const service = new CommunicationsService({} as any, {} as any, {} as any);
  const evaluate = (
    guest: any,
    audience: CommunicationAudience,
    templateKey?: string,
  ) => (service as any).evaluateEligibility(guest, campaign(audience), templateKey);

  it('keeps RSVP reminders limited to groups with pending members', () => {
    const pending = group({ members: [{ id: '1', name: 'João', attending: null }] });
    expect(evaluate(pending, CommunicationAudience.RSVP_PENDING)).toEqual({ eligible: true });
    expect(evaluate(group(), CommunicationAudience.RSVP_PENDING)).toEqual({
      eligible: false,
      reason: 'RSVP_ALREADY_COMPLETED',
    });
  });

  it('treats an unanswered reception choice as RSVP pending', () => {
    const partyPending = group({
      invitedToParty: true,
      rsvpResponse: { partyAttending: null },
    });
    expect(evaluate(partyPending, CommunicationAudience.RSVP_PENDING)).toEqual({
      eligible: true,
    });
    expect(evaluate(partyPending, CommunicationAudience.CONFIRMED)).toEqual({
      eligible: false,
      reason: 'NOT_CONFIRMED',
    });
    expect(evaluate(partyPending, CommunicationAudience.CEREMONY_ONLY_CONFIRMED)).toEqual({
      eligible: false,
      reason: 'NOT_CEREMONY_ONLY_CONFIRMED',
    });
  });

  it('never exposes party details to a party invite that declined the reception', () => {
    const declinedParty = group({
      invitedToParty: true,
      rsvpResponse: { partyAttending: false },
    });
    expect(evaluate(declinedParty, CommunicationAudience.CEREMONY_ONLY_CONFIRMED)).toEqual({
      eligible: true,
    });
    expect(evaluate(declinedParty, CommunicationAudience.PARTY_CONFIRMED)).toEqual({
      eligible: false,
      reason: 'NOT_PARTY_CONFIRMED',
    });
  });

  it('partitions a confirmed party guest into the party communication only', () => {
    const partyGuest = group({
      invitedToParty: true,
      rsvpResponse: { partyAttending: true },
    });
    expect(evaluate(partyGuest, CommunicationAudience.PARTY_CONFIRMED)).toEqual({
      eligible: true,
    });
    expect(evaluate(partyGuest, CommunicationAudience.CEREMONY_ONLY_CONFIRMED)).toEqual({
      eligible: false,
      reason: 'NOT_CEREMONY_ONLY_CONFIRMED',
    });
  });

  it('protects official party-detail templates even if the campaign audience is misconfigured', () => {
    const ceremonyOnly = group({ invitedToParty: false });
    expect(evaluate(ceremonyOnly, CommunicationAudience.ALL, 'INFO_PARTY')).toEqual({
      eligible: false,
      reason: 'PARTY_DETAILS_NOT_ALLOWED',
    });

    const partyGuest = group({
      invitedToParty: true,
      rsvpResponse: { partyAttending: true },
    });
    expect(evaluate(partyGuest, CommunicationAudience.ALL, 'INFO_PARTY')).toEqual({
      eligible: true,
    });
  });

  it('blocks opt-out and invalid phones before audience rules', () => {
    expect(evaluate(group({ whatsappOptOut: true }), CommunicationAudience.ALL)).toEqual({
      eligible: false,
      reason: 'WHATSAPP_OPT_OUT',
    });
    expect(
      evaluate(
        group({ phone: '123', phoneNormalized: null }),
        CommunicationAudience.ALL,
      ),
    ).toEqual({
      eligible: false,
      reason: 'NO_VALID_PHONE',
    });
  });
});

describe('CommunicationsService campaign safety', () => {
  it('persists the reviewed recipients as the delivery snapshot during preview', async () => {
    const updatedAt = new Date('2026-09-08T12:00:00-03:00');
    const campaignRecord = {
      id: 'campaign-1',
      status: CommunicationCampaignStatus.DRAFT,
      updatedAt,
      audience: CommunicationAudience.ALL,
      includeGuestGroupIds: [],
      requireInviteSent: true,
      template: {
        id: 'template-1',
        key: 'INTRO',
        active: true,
        bodySingle: 'Oi {{nome}}',
        bodyGroup: 'Oi {{nome}}',
      },
    };
    const tx = {
      communicationCampaign: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      communicationDelivery: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      communicationCampaign: {
        findUnique: jest.fn().mockResolvedValue(campaignRecord),
      },
      guestGroup: {
        findMany: jest.fn().mockResolvedValue([group()]),
      },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const config = { get: jest.fn((_key: string, fallback: string) => fallback) };
    const service = new CommunicationsService(prisma as any, {} as any, config as any);

    const preview = await service.preview('campaign-1');

    expect(preview.invitationCount).toBe(1);
    expect(tx.communicationDelivery.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          campaignId: 'campaign-1',
          guestGroupId: 'group-1',
          phone: '5519999999999',
          renderedMessage: 'Oi Família Teste',
        }),
      ],
    });
  });

  it('only completes an empty started campaign while it is still PROCESSING', async () => {
    const updateMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const prisma = {
      communicationCampaign: {
        updateMany,
        findUnique: jest.fn().mockResolvedValue({
          id: 'campaign-1',
          template: { active: true },
        }),
      },
      communicationDelivery: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const service = new CommunicationsService(prisma as any, {} as any, {} as any);

    await (service as any).startCampaign('campaign-1');

    expect(updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          id: 'campaign-1',
          status: CommunicationCampaignStatus.PROCESSING,
        },
      }),
    );
  });
});


describe('CommunicationsService reviewed delivery behavior', () => {
  it('rejects scheduling in the past before touching the database', async () => {
    const service = new CommunicationsService({} as any, {} as any, {} as any);

    await expect(
      service.schedule('campaign-1', new Date('2026-01-01T12:00:00Z')),
    ).rejects.toThrow('Escolha uma data futura');
  });

  it('keeps a scheduled campaign scheduled when its audience is previewed again', async () => {
    const updatedAt = new Date('2026-10-05T12:00:00-03:00');
    const campaignRecord = {
      id: 'campaign-1',
      status: CommunicationCampaignStatus.SCHEDULED,
      updatedAt,
      audience: CommunicationAudience.ALL,
      includeGuestGroupIds: [],
      requireInviteSent: true,
      template: {
        id: 'template-1',
        key: 'INTRO',
        active: true,
        bodySingle: 'Oi {{nome}}',
        bodyGroup: 'Oi {{nome}}',
      },
    };
    const tx = {
      communicationCampaign: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      communicationDelivery: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      communicationCampaign: {
        findUnique: jest.fn().mockResolvedValue(campaignRecord),
      },
      guestGroup: {
        findMany: jest.fn().mockResolvedValue([group()]),
      },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const config = { get: jest.fn((_key: string, fallback: string) => fallback) };
    const service = new CommunicationsService(prisma as any, {} as any, config as any);

    await service.preview('campaign-1');

    expect(tx.communicationCampaign.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          status: CommunicationCampaignStatus.DRAFT,
        }),
      }),
    );
  });

  it('refreshes dynamic RSVP variables at send time without changing the reviewed recipient', async () => {
    const guest = group({
      members: [
        { id: 'member-1', name: 'João', attending: true },
        { id: 'member-2', name: 'Maria', attending: null },
      ],
    });
    const delivery = {
      id: 'delivery-1',
      campaignId: 'campaign-1',
      guestGroupId: guest.id,
      phone: guest.phoneNormalized,
      renderedMessage: 'Preview antigo: João e Maria pendentes',
      status: CommunicationDeliveryStatus.PROCESSING,
      attempts: 0,
      campaign: {
        id: 'campaign-1',
        status: CommunicationCampaignStatus.PROCESSING,
        audience: CommunicationAudience.RSVP_PENDING,
        includeGuestGroupIds: [],
        requireInviteSent: true,
        template: {
          key: 'RSVP_REMINDER_1',
          active: true,
          bodySingle: 'Pendente: {{pendentes}}',
          bodyGroup: 'Pendente: {{pendentes}}',
        },
      },
      guestGroup: guest,
    };
    const prisma = {
      communicationDelivery: {
        findUnique: jest.fn().mockResolvedValue(delivery),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      communicationCampaign: {
        findUnique: jest.fn().mockResolvedValue({
          status: CommunicationCampaignStatus.PROCESSING,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      guestGroup: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const whatsapp = {
      sendText: jest.fn().mockResolvedValue({ providerMessageId: 'provider-1' }),
    };
    const service = new CommunicationsService(
      prisma as any,
      whatsapp as any,
      { get: jest.fn((_key: string, fallback: string) => fallback) } as any,
    );

    await (service as any).processDelivery('delivery-1');

    expect(whatsapp.sendText).toHaveBeenCalledWith(
      guest.phoneNormalized,
      'Pendente: Maria',
      guest.id,
      'campaign:campaign-1',
    );
  });

  it('resolves only handoff messages that existed up to the selected message', async () => {
    const createdAt = new Date('2026-10-05T14:00:00Z');
    const prisma = {
      whatsAppMessage: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'message-1',
          phone: '5519999999999',
          createdAt,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const service = new CommunicationsService(prisma as any, {} as any, {} as any);

    await service.resolveConversationMessage('message-1');

    expect(prisma.whatsAppMessage.updateMany).toHaveBeenCalledWith({
      where: {
        phone: '5519999999999',
        needsHuman: true,
        resolvedAt: null,
        createdAt: { lte: createdAt },
      },
      data: { resolvedAt: expect.any(Date), needsHuman: false },
    });
  });
});


describe('CommunicationsService failure semantics', () => {
  it('never automatically retries an ambiguous transport result', async () => {
    const guest = group();
    const delivery = {
      id: 'delivery-ambiguous',
      campaignId: 'campaign-1',
      guestGroupId: guest.id,
      phone: guest.phoneNormalized,
      renderedMessage: 'Mensagem aprovada',
      status: CommunicationDeliveryStatus.PROCESSING,
      attempts: 0,
      campaign: {
        id: 'campaign-1',
        status: CommunicationCampaignStatus.PROCESSING,
        audience: CommunicationAudience.ALL,
        includeGuestGroupIds: [],
        requireInviteSent: true,
        template: {
          key: 'INTRO',
          active: true,
          bodySingle: 'Mensagem aprovada',
          bodyGroup: 'Mensagem aprovada',
        },
      },
      guestGroup: guest,
    };
    const prisma = {
      communicationDelivery: {
        findUnique: jest.fn().mockResolvedValue(delivery),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
      },
      communicationCampaign: {
        findUnique: jest.fn().mockResolvedValue({
          status: CommunicationCampaignStatus.PROCESSING,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      guestGroup: {
        count: jest.fn().mockResolvedValue(1),
      },
    };
    const whatsapp = {
      sendText: jest
        .fn()
        .mockRejectedValue(new WhatsAppAmbiguousSendError('timeout após envio')),
    };
    const service = new CommunicationsService(
      prisma as any,
      whatsapp as any,
      { get: jest.fn((_key: string, fallback: string) => fallback) } as any,
    );

    await (service as any).processDelivery('delivery-ambiguous');

    expect(prisma.communicationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-ambiguous' },
      data: expect.objectContaining({
        status: CommunicationDeliveryStatus.FAILED,
        nextAttemptAt: null,
        lastError: expect.stringContaining('UNCERTAIN_SEND:'),
      }),
    });
  });

  it('rolls back template edits if a campaign starts processing during invalidation', async () => {
    const tx = {
      communicationCampaign: {
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'campaign-1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      communicationDelivery: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      communicationTemplate: {
        update: jest.fn(),
      },
    };
    const prisma = {
      communicationTemplate: {
        findUnique: jest.fn().mockResolvedValue({ id: 'template-1' }),
      },
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const service = new CommunicationsService(prisma as any, {} as any, {} as any);

    await expect(
      service.updateTemplate('template-1', {
        name: 'Template',
        description: '',
        bodySingle: 'Oi',
        bodyGroup: 'Olá',
        active: true,
      }),
    ).rejects.toThrow('começou a ser processada durante a edição');

    expect(tx.communicationTemplate.update).not.toHaveBeenCalled();
  });
});
