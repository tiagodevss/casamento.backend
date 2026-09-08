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
          if (!data || !Object.prototype.hasOwnProperty.call(data, 'phone')) return;
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
