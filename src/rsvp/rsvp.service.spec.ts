import { BadRequestException } from '@nestjs/common';
import { RsvpService } from './rsvp.service';

function setup(options: { partyOpen: boolean; partyAttending: boolean | null; invitedToParty?: boolean }) {
  const upsert = jest.fn().mockResolvedValue({});
  const prisma = {
    guestGroup: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'group-1',
        displayName: 'Família Teste',
        invitedToParty: options.invitedToParty ?? true,
        members: [{ id: 'm1', name: 'Ana', isChild: false, attending: null }],
        rsvpResponse: { partyAttending: options.partyAttending },
      }),
    },
    $transaction: jest.fn(async (callback: any) =>
      callback({ guestMember: { update: jest.fn() }, rsvpResponse: { upsert } }),
    ),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) =>
      key === 'PARTY_RSVP_OPEN' ? options.partyOpen : fallback,
    ),
  };
  const service = new RsvpService(prisma as any, config as any);
  jest.spyOn(service, 'getInvite').mockResolvedValue({} as any);
  return { service, upsert };
}

const members = [{ id: 'm1', attending: true }];

describe('RsvpService com a festa encerrada', () => {
  it('confirma a cerimônia e preserva quem já confirmou a festa', async () => {
    const { service, upsert } = setup({ partyOpen: false, partyAttending: true });
    await service.confirm('group-1', { members });
    expect(upsert.mock.calls[0][0].update.partyAttending).toBe(true);
  });

  it('não grava resposta de festa para quem nunca respondeu', async () => {
    const { service, upsert } = setup({ partyOpen: false, partyAttending: null });
    await service.confirm('group-1', { members });
    expect(upsert.mock.calls[0][0].create.partyAttending).toBeNull();
    expect(upsert.mock.calls[0][0].update.partyAttending).toBeNull();
  });

  it('aceita reenvio com o mesmo valor, mas recusa mudar a festa', async () => {
    const { service, upsert } = setup({ partyOpen: false, partyAttending: true });
    await service.confirm('group-1', { members, partyAttending: true });
    expect(upsert).toHaveBeenCalledTimes(1);

    await expect(
      service.confirm('group-1', { members, partyAttending: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('o painel administrativo ainda consegue corrigir a festa', async () => {
    const { service, upsert } = setup({ partyOpen: false, partyAttending: true });
    await service.confirm('group-1', { members, partyAttending: false }, undefined, {
      allowPartyChange: true,
    });
    expect(upsert.mock.calls[0][0].update.partyAttending).toBe(false);
  });
});

describe('RsvpService com a festa aberta', () => {
  it('mantém o comportamento anterior', async () => {
    const { service, upsert } = setup({ partyOpen: true, partyAttending: null });
    await service.confirm('group-1', { members, partyAttending: true });
    expect(upsert.mock.calls[0][0].update.partyAttending).toBe(true);
  });

  it('ignora a festa em convites que não a incluem', async () => {
    const { service, upsert } = setup({ partyOpen: true, partyAttending: null, invitedToParty: false });
    await service.confirm('group-1', { members });
    expect(upsert.mock.calls[0][0].update.partyAttending).toBeNull();
  });
});
