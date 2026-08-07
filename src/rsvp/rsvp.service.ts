import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName } from '../common/normalize-name';
import { ConfirmRsvpDto } from './confirm-rsvp.dto';

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 10;

const membersInclude = {
  members: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  rsvpResponse: true,
};

@Injectable()
export class RsvpService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    const normalizedQuery = normalizeName(query ?? '');
    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      throw new BadRequestException(`Digite ao menos ${MIN_QUERY_LENGTH} caracteres`);
    }

    // Guest lists for a wedding are small (low hundreds at most), so a JS substring
    // scan over normalized names is simpler and more portable than requiring the
    // Postgres `unaccent` extension for partial matching.
    const allGroups = await this.prisma.guestGroup.findMany({
      include: membersInclude,
      take: 1000,
    });

    const candidates = allGroups
      .filter((group) => {
        const inSearchNames = group.searchNames.some((name) => name.includes(normalizedQuery));
        const inMembers = group.members.some((member) =>
          normalizeName(member.name).includes(normalizedQuery),
        );
        const inDisplayName = normalizeName(group.displayName).includes(normalizedQuery);
        return inSearchNames || inMembers || inDisplayName;
      })
      .slice(0, MAX_RESULTS);

    return candidates.map((group) => ({
      id: group.id,
      displayName: group.displayName,
      invitedToParty: group.invitedToParty,
      hasResponded: Boolean(group.rsvpResponse),
      memberCount: group.members.length,
      memberNames: group.members.map((member) => member.name),
    }));
  }

  async getInvite(guestGroupId: string) {
    const group = await this.prisma.guestGroup.findUnique({
      where: { id: guestGroupId },
      include: membersInclude,
    });
    if (!group) throw new NotFoundException('Convidado não encontrado');

    return {
      id: group.id,
      displayName: group.displayName,
      invitedToParty: group.invitedToParty,
      hasResponded: Boolean(group.rsvpResponse),
      partyAttending: group.rsvpResponse?.partyAttending ?? null,
      diet: group.rsvpResponse?.diet ?? null,
      message: group.rsvpResponse?.message ?? null,
      members: group.members.map((member) => ({
        id: member.id,
        name: member.name,
        isChild: member.isChild,
        attending: member.attending,
      })),
    };
  }

  async confirm(guestGroupId: string, dto: ConfirmRsvpDto, ip?: string) {
    const group = await this.prisma.guestGroup.findUnique({
      where: { id: guestGroupId },
      include: { members: true },
    });
    if (!group) throw new NotFoundException('Convidado não encontrado');

    if (dto.partyAttending !== undefined && !group.invitedToParty) {
      throw new BadRequestException('Este convite não inclui a festa');
    }

    const existingIds = new Set(group.members.map((member) => member.id));
    const incomingIds = new Set(dto.members.map((member) => member.id));

    if (existingIds.size !== incomingIds.size || [...existingIds].some((id) => !incomingIds.has(id))) {
      throw new BadRequestException(
        'A confirmação deve incluir exatamente as pessoas deste convite',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const member of dto.members) {
        await tx.guestMember.update({
          where: { id: member.id },
          data: { attending: member.attending },
        });
      }

      await tx.rsvpResponse.upsert({
        where: { guestGroupId },
        create: {
          guestGroupId,
          partyAttending: group.invitedToParty ? dto.partyAttending ?? null : null,
          diet: dto.diet,
          message: dto.message,
          respondedIp: ip,
        },
        update: {
          partyAttending: group.invitedToParty ? dto.partyAttending ?? null : null,
          diet: dto.diet,
          message: dto.message,
          respondedIp: ip,
        },
      });
    });

    return this.getInvite(guestGroupId);
  }
}
