import { GuestSide } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GuestsService } from './guests.service';

describe('GuestsService.stats', () => {
  it('conta pessoas, e não convites, nos indicadores do dashboard', async () => {
    const prisma = {
      guestGroup: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'family',
            side: GuestSide.GROOM,
            inviteSent: true,
            invitedToParty: true,
            rsvpResponse: { partyAttending: true },
            members: [
              { attending: true },
              { attending: true },
              { attending: true },
              { attending: false },
            ],
          },
          {
            id: 'single',
            side: GuestSide.BRIDE,
            inviteSent: false,
            invitedToParty: false,
            rsvpResponse: null,
            members: [{ attending: null }],
          },
          {
            id: 'couple',
            side: GuestSide.BOTH,
            inviteSent: true,
            invitedToParty: true,
            rsvpResponse: { partyAttending: false },
            members: [{ attending: true }, { attending: true }],
          },
        ]),
      },
      rsvpResponse: {
        count: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
      },
    } as unknown as PrismaService;

    const service = new GuestsService(prisma);

    await expect(service.stats()).resolves.toEqual({
      groups: {
        total: 3,
        inviteSent: 2,
        inviteNotSent: 1,
        responded: 2,
        pendingResponse: 1,
      },
      members: {
        total: 7,
        inviteSent: 6,
        inviteNotSent: 1,
        responded: 6,
        pendingResponse: 1,
        attending: 5,
        notAttending: 1,
        pending: 1,
        ceremonyOnly: 1,
        ceremonyAndParty: 6,
      },
      bySide: {
        [GuestSide.GROOM]: {
          groups: 1,
          members: 4,
          attending: 3,
          notAttending: 1,
          pending: 0,
          responded: 4,
        },
        [GuestSide.BRIDE]: {
          groups: 1,
          members: 1,
          attending: 0,
          notAttending: 0,
          pending: 1,
          responded: 0,
        },
        [GuestSide.BOTH]: {
          groups: 1,
          members: 2,
          attending: 2,
          notAttending: 0,
          pending: 0,
          responded: 2,
        },
      },
      party: {
        invited: 6,
        attending: 3,
        notAttending: 3,
        pending: 0,
      },
      messages: { withText: 1 },
      diets: { withText: 2 },
    });
  });
});
