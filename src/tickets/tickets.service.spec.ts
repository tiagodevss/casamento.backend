import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';

const TOKEN = 'tok_abcdefghijklmnopqrstuv';

function setup(overrides: Record<string, unknown> | null = {}) {
  const base = {
    id: 'group-1',
    displayName: 'Família Teste',
    ticketToken: TOKEN,
    checkedInAt: null as Date | null,
    members: [
      { name: 'Ana', attending: true },
      { name: 'Bia', attending: false },
      { name: 'Caio', attending: true },
    ],
    rsvpResponse: { partyAttending: true },
  };
  const state = overrides === null ? null : { ...base, ...overrides };
  const prisma = {
    guestGroup: {
      findUnique: jest.fn(async () => state),
      findMany: jest.fn(async () => (state ? [state] : [])),
      updateMany: jest.fn(async ({ data }: any) => {
        if (state && !state.checkedInAt) state.checkedInAt = data.checkedInAt;
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: any) => {
        if (state) state.checkedInAt = data.checkedInAt;
        return state;
      }),
    },
  };
  const config = { get: jest.fn((_key: string, fallback?: string) => fallback) };
  return { service: new TicketsService(prisma as any, config as any), prisma, state };
}

describe('TicketsService', () => {
  it('mostra o ingresso só com quem vai à festa e o endereço de check-in', async () => {
    const { service } = setup();
    expect(await service.getPublicTicket(TOKEN)).toEqual({
      displayName: 'Família Teste',
      people: ['Ana', 'Caio'],
      peopleCount: 2,
      valid: true,
      checkinUrl: `https://tiagoegabriela.com.br/admin/checkin/${TOKEN}`,
    });
  });

  it('rejeita token malformado ou desconhecido sem consultar com dados do usuário', async () => {
    await expect(setup().service.lookup('curto')).rejects.toBeInstanceOf(NotFoundException);
    const { service, prisma } = setup(null);
    await expect(service.lookup(TOKEN)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.guestGroup.findUnique).toHaveBeenCalledTimes(1);
  });

  it('libera a entrada uma única vez', async () => {
    const { service } = setup();
    expect((await service.lookup(TOKEN)).status).toBe('READY');

    const first = await service.checkIn(TOKEN);
    expect(first.status).toBe('ALREADY_IN');
    const enteredAt = first.checkedInAt;

    const second = await service.checkIn(TOKEN);
    expect(second.status).toBe('ALREADY_IN');
    expect(second.checkedInAt).toEqual(enteredAt);
  });

  it('só atualiza linhas ainda sem entrada (proteção contra leitura dupla simultânea)', async () => {
    const { service, prisma } = setup();
    await service.checkIn(TOKEN);
    expect(prisma.guestGroup.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'group-1', checkedInAt: null } }),
    );
  });

  it('não libera ingresso de quem não confirmou a festa', async () => {
    for (const rsvpResponse of [{ partyAttending: false }, { partyAttending: null }, null]) {
      const { service, prisma } = setup({ rsvpResponse });
      const result = await service.checkIn(TOKEN);
      expect(result.status).toBe('INVALID');
      expect(prisma.guestGroup.updateMany).not.toHaveBeenCalled();
    }
    const { service } = setup({ members: [{ name: 'Ana', attending: false }] });
    expect((await service.lookup(TOKEN)).status).toBe('INVALID');
  });

  it('lista os ingressos para o painel com totais e link do ingresso', async () => {
    const entered = {
      id: 'g2',
      displayName: 'Já entrou',
      side: 'BRIDE',
      ticketToken: 'tok_entrou_abcdefghijkl',
      checkedInAt: new Date('2026-11-14T22:00:00Z'),
      phoneNormalized: '5519999990000',
      members: [{ name: 'Dani', attending: true }],
      rsvpResponse: { partyAttending: true },
    };
    const invalid = {
      id: 'g3',
      displayName: 'Desistiu',
      side: 'GROOM',
      ticketToken: 'tok_desistiu_abcdefghij',
      checkedInAt: null,
      members: [{ name: 'Edu', attending: false }],
      rsvpResponse: { partyAttending: false },
    };
    const { service, prisma, state } = setup();
    prisma.guestGroup.findMany.mockResolvedValueOnce([state, entered, invalid] as any);

    const result = await service.listForAdmin();

    expect(result.summary).toEqual({
      groups: 2,
      people: 3,
      enteredGroups: 1,
      enteredPeople: 1,
      invalidGroups: 1,
    });
    expect(result.tickets.map((t) => t.status)).toEqual(['READY', 'ALREADY_IN', 'INVALID']);
    expect(result.tickets[0].ticketUrl).toBe(`https://tiagoegabriela.com.br/ingresso/${TOKEN}`);
    expect(result.tickets[1].hasPhone).toBe(true);
    expect(prisma.guestGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ticketToken: { not: null } } }),
    );
  });

  it('desfaz uma leitura feita por engano', async () => {
    const { service } = setup({ checkedInAt: new Date() });
    expect((await service.undoCheckIn(TOKEN)).status).toBe('READY');
  });
});
