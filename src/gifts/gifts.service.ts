import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GiftsService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.gift.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getActiveById(id: string) {
    const gift = await this.prisma.gift.findFirst({ where: { id, active: true } });
    if (!gift) throw new NotFoundException('Presente não encontrado');
    return gift;
  }
}
