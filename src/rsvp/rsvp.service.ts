import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName } from '../common/normalize-name';
import { ConfirmRsvpDto } from './confirm-rsvp.dto';

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 10;

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
      include: { rsvpResponse: true },
      take: 1000,
    });

    const candidates = allGroups
      .filter((group) => group.searchNames.some((name) => name.includes(normalizedQuery)))
      .slice(0, MAX_RESULTS);

    return candidates.map((group) => ({
      id: group.id,
      displayName: group.displayName,
      maxCompanions: group.maxCompanions,
      hasResponded: Boolean(group.rsvpResponse),
    }));
  }

  async confirm(guestGroupId: string, dto: ConfirmRsvpDto, ip?: string) {
    const group = await this.prisma.guestGroup.findUnique({ where: { id: guestGroupId } });
    if (!group) throw new NotFoundException('Convidado não encontrado');

    if (dto.companionsCount > group.maxCompanions) {
      throw new BadRequestException(
        `Este convite permite no máximo ${group.maxCompanions} acompanhante(s)`,
      );
    }

    return this.prisma.rsvpResponse.upsert({
      where: { guestGroupId },
      create: {
        guestGroupId,
        attending: dto.attending,
        companionsCount: dto.companionsCount,
        companionNames: dto.companionNames,
        diet: dto.diet,
        message: dto.message,
        respondedIp: ip,
      },
      update: {
        attending: dto.attending,
        companionsCount: dto.companionsCount,
        companionNames: dto.companionNames,
        diet: dto.diet,
        message: dto.message,
        respondedIp: ip,
      },
    });
  }
}
