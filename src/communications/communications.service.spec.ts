import { CommunicationAudience } from '@prisma/client';
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
