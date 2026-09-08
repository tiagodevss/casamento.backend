import {
  CommunicationAudience,
  CommunicationCampaignStatus,
} from '@prisma/client';
import { CommunicationsService } from './communications.service';

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
