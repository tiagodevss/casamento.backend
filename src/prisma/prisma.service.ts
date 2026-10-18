import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeBrazilPhone } from '../whatsapp/phone.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      if (params.model === 'GuestGroup' && ['create', 'update', 'upsert'].includes(params.action)) {
        const normalizeData = (data?: Record<string, unknown>) => {
          // Prisma update payloads may contain `phone: undefined` when an unrelated field is
          // changed. In that case the database keeps the current phone, so we must also keep
          // the existing normalized value instead of accidentally clearing it.
          if (!data || data.phone === undefined) return;
          const phone = typeof data.phone === 'string' ? data.phone : null;
          data.phoneNormalized = normalizeBrazilPhone(phone);
        };

        if (params.action === 'upsert') {
          normalizeData(params.args?.create);
          normalizeData(params.args?.update);
        } else {
          normalizeData(params.args?.data);
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
