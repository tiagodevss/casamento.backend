import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateGiftDto, UpdateGiftDto } from './gift.dto';

@Injectable()
export class GiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  listActive() {
    return this.prisma.gift.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listAll() {
    return this.prisma.gift.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async getById(id: string) {
    const gift = await this.prisma.gift.findUnique({ where: { id } });
    if (!gift) throw new NotFoundException('Presente não encontrado');
    return gift;
  }

  async getActiveById(id: string) {
    const gift = await this.prisma.gift.findFirst({ where: { id, active: true } });
    if (!gift) throw new NotFoundException('Presente não encontrado');
    return gift;
  }

  async create(dto: CreateGiftDto) {
    const externalId = `g-${randomBytes(4).toString('hex')}`;
    return this.prisma.gift.create({
      data: {
        externalId,
        title: dto.title,
        description: dto.description,
        iconName: dto.iconName,
        priceCents: dto.priceCents,
        tag: dto.tag ?? null,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateGiftDto) {
    await this.getById(id);
    return this.prisma.gift.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.iconName !== undefined ? { iconName: dto.iconName } : {}),
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.tag !== undefined ? { tag: dto.tag } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async setActive(id: string, active: boolean) {
    await this.getById(id);
    return this.prisma.gift.update({
      where: { id },
      data: { active },
    });
  }

  async setImage(id: string, file: Express.Multer.File) {
    const gift = await this.getById(id);
    const imagePath = await this.uploads.saveGiftImage(id, file, gift.imagePath);
    return this.prisma.gift.update({
      where: { id },
      data: { imagePath },
    });
  }

  async clearImage(id: string) {
    const gift = await this.getById(id);
    await this.uploads.deleteRelative(gift.imagePath);
    return this.prisma.gift.update({
      where: { id },
      data: { imagePath: null },
    });
  }
}
