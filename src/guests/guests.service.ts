import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeName } from '../common/normalize-name';
import { CreateGuestGroupDto, UpdateGuestGroupDto } from './guest-group.dto';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.guestGroup.findMany({
      include: { rsvpResponse: true },
      orderBy: { displayName: 'asc' },
    });
  }

  async get(id: string) {
    const group = await this.prisma.guestGroup.findUnique({
      where: { id },
      include: { rsvpResponse: true },
    });
    if (!group) throw new NotFoundException('Convidado não encontrado');
    return group;
  }

  create(dto: CreateGuestGroupDto) {
    return this.prisma.guestGroup.create({
      data: { ...dto, searchNames: dto.searchNames.map(normalizeName) },
    });
  }

  async update(id: string, dto: UpdateGuestGroupDto) {
    await this.get(id);
    return this.prisma.guestGroup.update({
      where: { id },
      data: {
        ...dto,
        searchNames: dto.searchNames ? dto.searchNames.map(normalizeName) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.guestGroup.delete({ where: { id } });
  }
}
