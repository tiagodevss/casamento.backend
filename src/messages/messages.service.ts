import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.guestMessage.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: CreateMessageDto) {
    // Honeypot tripped: pretend it worked so the bot doesn't learn anything, but never persist.
    if (dto.website) {
      return { id: `discarded-${Date.now()}`, name: dto.name.trim(), text: dto.text.trim(), createdAt: new Date() };
    }

    return this.prisma.guestMessage.create({
      data: { name: dto.name.trim(), text: dto.text.trim() },
    });
  }
}
