import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GuestSide, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName } from '../common/normalize-name';
import { CreateGuestGroupDto, GuestMemberInputDto, UpdateGuestGroupDto } from './guest-group.dto';

const membersInclude = {
  members: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  rsvpResponse: true,
};

function resolveMembers(
  displayName: string,
  members: GuestMemberInputDto[] | undefined,
): GuestMemberInputDto[] {
  const cleaned = (members ?? [])
    .map((member) => ({
      ...(member.id ? { id: member.id } : {}),
      name: member.name.trim(),
      isChild: Boolean(member.isChild),
    }))
    .filter((member) => member.name);

  if (cleaned.length === 0) {
    return [{ name: displayName.trim(), isChild: false }];
  }

  return cleaned;
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

function buildSearchNames(
  displayName: string,
  aliases: string[] | undefined,
  members: GuestMemberInputDto[],
): string[] {
  return uniqueNames([
    normalizeName(displayName),
    ...(aliases ?? []).map(normalizeName),
    ...members.map((member) => normalizeName(member.name)),
  ]);
}

const emptySideStats = () => ({
  groups: 0,
  members: 0,
  attending: 0,
  notAttending: 0,
  pending: 0,
  responded: 0,
});

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.guestGroup.findMany({
      include: membersInclude,
      orderBy: { displayName: 'asc' },
    });
  }

  async stats() {
    const [groups, respondedGroups, inviteSentGroups, partyInvitedGroups, messageCount, dietCount] =
      await Promise.all([
        this.prisma.guestGroup.findMany({
          select: {
            id: true,
            side: true,
            inviteSent: true,
            invitedToParty: true,
            rsvpResponse: { select: { partyAttending: true } },
            members: { select: { attending: true } },
            _count: { select: { members: true } },
          },
        }),
        this.prisma.rsvpResponse.count(),
        this.prisma.guestGroup.count({ where: { inviteSent: true } }),
        this.prisma.guestGroup.count({ where: { invitedToParty: true } }),
        this.prisma.rsvpResponse.count({
          where: { message: { not: null }, NOT: { message: '' } },
        }),
        this.prisma.rsvpResponse.count({
          where: { diet: { not: null }, NOT: { diet: '' } },
        }),
      ]);

    const totalGroups = groups.length;
    let totalMembers = 0;
    let attending = 0;
    let notAttending = 0;
    let pendingAttendance = 0;

    const bySide: Record<GuestSide, ReturnType<typeof emptySideStats>> = {
      [GuestSide.GROOM]: emptySideStats(),
      [GuestSide.BRIDE]: emptySideStats(),
      [GuestSide.BOTH]: emptySideStats(),
    };

    for (const group of groups) {
      const sideStats = bySide[group.side];
      sideStats.groups += 1;
      sideStats.members += group._count.members;
      if (group.rsvpResponse) sideStats.responded += 1;

      totalMembers += group.members.length;
      for (const member of group.members) {
        if (member.attending === true) {
          attending += 1;
          sideStats.attending += 1;
        } else if (member.attending === false) {
          notAttending += 1;
          sideStats.notAttending += 1;
        } else {
          pendingAttendance += 1;
          sideStats.pending += 1;
        }
      }
    }

    let partyAttending = 0;
    let partyNotAttending = 0;
    let partyPending = 0;
    for (const group of groups) {
      if (!group.invitedToParty) continue;
      if (group.rsvpResponse?.partyAttending === true) partyAttending += 1;
      else if (group.rsvpResponse?.partyAttending === false) partyNotAttending += 1;
      else partyPending += 1;
    }

    return {
      groups: {
        total: totalGroups,
        inviteSent: inviteSentGroups,
        inviteNotSent: totalGroups - inviteSentGroups,
        responded: respondedGroups,
        pendingResponse: totalGroups - respondedGroups,
      },
      members: {
        total: totalMembers,
        attending,
        notAttending,
        pending: pendingAttendance,
      },
      bySide,
      party: {
        invited: partyInvitedGroups,
        attending: partyAttending,
        notAttending: partyNotAttending,
        pending: partyPending,
      },
      messages: { withText: messageCount },
      diets: { withText: dietCount },
    };
  }

  async get(id: string) {
    const group = await this.prisma.guestGroup.findUnique({
      where: { id },
      include: membersInclude,
    });
    if (!group) throw new NotFoundException('Convidado não encontrado');
    return group;
  }

  create(dto: CreateGuestGroupDto) {
    const displayName = dto.displayName.trim();
    const members = resolveMembers(displayName, dto.members);
    if (members.some((member) => member.name.length < 2)) {
      throw new BadRequestException('Cada pessoa precisa de um nome válido');
    }

    return this.prisma.guestGroup.create({
      data: {
        displayName,
        side: dto.side,
        inviteSent: dto.inviteSent ?? false,
        invitedToParty: dto.invitedToParty ?? false,
        phone: dto.phone,
        notes: dto.notes,
        searchNames: buildSearchNames(displayName, dto.searchNames, members),
        members: {
          create: members.map((member, index) => ({
            name: member.name,
            isChild: member.isChild ?? false,
            sortOrder: index,
          })),
        },
      },
      include: membersInclude,
    });
  }

  private normalizeRsvpText(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async upsertRsvpTextFields(
    id: string,
    dto: Pick<UpdateGuestGroupDto, 'message' | 'diet'>,
  ) {
    if (dto.message === undefined && dto.diet === undefined) return;

    const data: Prisma.RsvpResponseUpdateInput = {};
    const create: Prisma.RsvpResponseUncheckedCreateInput = { guestGroupId: id };

    if (dto.message !== undefined) {
      const message = this.normalizeRsvpText(dto.message);
      data.message = message;
      create.message = message;
    }
    if (dto.diet !== undefined) {
      const diet = this.normalizeRsvpText(dto.diet);
      data.diet = diet;
      create.diet = diet;
    }

    const existing = await this.prisma.rsvpResponse.findUnique({
      where: { guestGroupId: id },
      select: { id: true },
    });

    if (!existing) {
      const hasText = Boolean(create.message || create.diet);
      if (!hasText) return;
      await this.prisma.rsvpResponse.create({ data: create });
      return;
    }

    await this.prisma.rsvpResponse.update({
      where: { guestGroupId: id },
      data,
    });
  }

  async update(id: string, dto: UpdateGuestGroupDto) {
    const existing = await this.get(id);

    const touchesGroupFields =
      dto.displayName !== undefined ||
      dto.searchNames !== undefined ||
      dto.members !== undefined ||
      dto.side !== undefined ||
      dto.inviteSent !== undefined ||
      dto.invitedToParty !== undefined ||
      dto.phone !== undefined ||
      dto.notes !== undefined;

    if (touchesGroupFields) {
      const sideData: Prisma.GuestGroupUpdateInput = {
        side: dto.side,
        inviteSent: dto.inviteSent,
      };

      if (dto.members) {
        const displayName = dto.displayName?.trim() ?? existing.displayName;
        const cleaned = resolveMembers(displayName, dto.members);
        if (cleaned.some((member) => member.name.length < 2)) {
          throw new BadRequestException('Cada pessoa precisa de um nome válido');
        }

        const aliases = dto.searchNames ?? existing.searchNames;
        // Prefer explicit aliases from the request; member names are always merged in.
        const aliasOnly = dto.searchNames !== undefined ? dto.searchNames : undefined;

        await this.prisma.$transaction(async (tx) => {
          const existingMembers = await tx.guestMember.findMany({ where: { guestGroupId: id } });
          const incomingIds = new Set(cleaned.map((member) => member.id).filter(Boolean) as string[]);
          const toDelete = existingMembers.filter((member) => !incomingIds.has(member.id));

          if (toDelete.length > 0) {
            await tx.guestMember.deleteMany({
              where: { id: { in: toDelete.map((member) => member.id) } },
            });
          }

          for (const [index, member] of cleaned.entries()) {
            if (member.id && existingMembers.some((item) => item.id === member.id)) {
              await tx.guestMember.update({
                where: { id: member.id },
                data: {
                  name: member.name,
                  isChild: member.isChild ?? false,
                  sortOrder: index,
                },
              });
            } else {
              await tx.guestMember.create({
                data: {
                  guestGroupId: id,
                  name: member.name,
                  isChild: member.isChild ?? false,
                  sortOrder: index,
                },
              });
            }
          }

          await tx.guestGroup.update({
            where: { id },
            data: {
              displayName: dto.displayName?.trim(),
              invitedToParty: dto.invitedToParty,
              phone: dto.phone,
              notes: dto.notes,
              ...sideData,
              searchNames: buildSearchNames(
                displayName,
                aliasOnly ??
                  // Keep only aliases that are not auto-derived from previous members/displayName
                  aliases.filter((name) => {
                    const derived = new Set([
                      normalizeName(existing.displayName),
                      ...existing.members.map((member) => normalizeName(member.name)),
                    ]);
                    return !derived.has(name);
                  }),
                cleaned,
              ),
            },
          });
        });
      } else {
        const displayName = dto.displayName?.trim() ?? existing.displayName;
        await this.prisma.guestGroup.update({
          where: { id },
          data: {
            displayName: dto.displayName?.trim(),
            invitedToParty: dto.invitedToParty,
            phone: dto.phone,
            notes: dto.notes,
            ...sideData,
            searchNames:
              dto.searchNames !== undefined || dto.displayName !== undefined
                ? buildSearchNames(
                    displayName,
                    dto.searchNames ??
                      existing.searchNames.filter((name) => {
                        const derived = new Set([
                          normalizeName(existing.displayName),
                          ...existing.members.map((member) => normalizeName(member.name)),
                        ]);
                        return !derived.has(name);
                      }),
                    existing.members,
                  )
                : undefined,
          },
        });
      }
    }

    await this.upsertRsvpTextFields(id, dto);
    return this.get(id);
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.guestGroup.delete({ where: { id } });
  }
}
