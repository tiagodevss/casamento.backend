import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const ticketInclude = {
  members: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  rsvpResponse: true,
};

export type TicketStatus = 'READY' | 'ALREADY_IN' | 'INVALID';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Página pública do ingresso: só mostra o que a própria família já sabe. */
  async getPublicTicket(token: string) {
    const group = await this.requireGroup(token);
    const view = this.view(group);
    return {
      displayName: view.displayName,
      people: view.people,
      peopleCount: view.peopleCount,
      valid: view.status !== 'INVALID',
      checkinUrl: this.checkinUrl(token),
    };
  }

  /** Lista de ingressos para o painel: só grupos que têm token, com o andamento da entrada. */
  async listForAdmin() {
    const groups = await this.prisma.guestGroup.findMany({
      where: { ticketToken: { not: null } },
      include: ticketInclude,
      orderBy: { displayName: 'asc' },
    });

    const tickets = groups.map((group) => {
      const view = this.view(group);
      return {
        id: group.id,
        displayName: view.displayName,
        side: group.side,
        people: view.people,
        peopleCount: view.peopleCount,
        status: view.status,
        checkedInAt: view.checkedInAt,
        hasPhone: Boolean(group.phoneNormalized ?? group.phone),
        ticketUrl: this.ticketUrl(group.ticketToken as string),
      };
    });

    const valid = tickets.filter((ticket) => ticket.status !== 'INVALID');
    const entered = valid.filter((ticket) => ticket.status === 'ALREADY_IN');
    return {
      summary: {
        groups: valid.length,
        people: valid.reduce((sum, ticket) => sum + ticket.peopleCount, 0),
        enteredGroups: entered.length,
        enteredPeople: entered.reduce((sum, ticket) => sum + ticket.peopleCount, 0),
        invalidGroups: tickets.length - valid.length,
      },
      tickets,
    };
  }

  async lookup(token: string) {
    return this.view(await this.requireGroup(token));
  }

  /** Marca a entrada de forma atômica: duas leituras simultâneas nunca liberam duas vezes. */
  async checkIn(token: string) {
    const group = await this.requireGroup(token);
    if (this.view(group).status === 'INVALID') return this.view(group);

    await this.prisma.guestGroup.updateMany({
      where: { id: group.id, checkedInAt: null },
      data: { checkedInAt: new Date() },
    });
    return this.view(await this.requireGroup(token));
  }

  /** Desfaz uma leitura feita por engano na porta. */
  async undoCheckIn(token: string) {
    const group = await this.requireGroup(token);
    await this.prisma.guestGroup.update({ where: { id: group.id }, data: { checkedInAt: null } });
    return this.view(await this.requireGroup(token));
  }

  private async requireGroup(token: string) {
    if (!TOKEN_PATTERN.test(token ?? '')) throw new NotFoundException('Ingresso não encontrado');
    const group = await this.prisma.guestGroup.findUnique({
      where: { ticketToken: token },
      include: ticketInclude,
    });
    if (!group) throw new NotFoundException('Ingresso não encontrado');
    return group;
  }

  private view(group: {
    displayName: string;
    checkedInAt: Date | null;
    members: { name: string; attending: boolean | null }[];
    rsvpResponse: { partyAttending: boolean | null } | null;
  }) {
    const people = group.members.filter((member) => member.attending === true).map((m) => m.name);
    const valid = group.rsvpResponse?.partyAttending === true && people.length > 0;
    const status: TicketStatus = !valid ? 'INVALID' : group.checkedInAt ? 'ALREADY_IN' : 'READY';
    return {
      displayName: group.displayName,
      people,
      peopleCount: people.length,
      status,
      checkedInAt: group.checkedInAt,
    };
  }

  private appUrl() {
    return this.config.get<string>('APP_URL', 'https://tiagoegabriela.com.br').replace(/\/$/, '');
  }

  private checkinUrl(token: string) {
    return `${this.appUrl()}/admin/checkin/${token}`;
  }

  private ticketUrl(token: string) {
    return `${this.appUrl()}/ingresso/${token}`;
  }
}
