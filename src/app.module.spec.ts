import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('AppModule', () => {
  const env = { ...process.env };

  beforeAll(() => {
    Object.assign(process.env, {
      NODE_ENV: 'development',
      JWT_SECRET: 'j'.repeat(32),
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/db',
      WPPCONNECT_SECRET: 'a'.repeat(32),
      WHATSAPP_WEBHOOK_SECRET: 'b'.repeat(32),
      ABACATEPAY_API_KEY: 'key',
      ABACATEPAY_WEBHOOK_SECRET: 'secret',
      ABACATEPAY_BASE_URL: 'http://abacate.test',
      CORS_ORIGIN: 'http://app.test',
    });
  });

  afterAll(() => {
    process.env = env;
  });

  it('resolve o grafo de dependências real (guards JWT em todos os módulos)', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    expect(moduleRef.get(PrismaService)).toBeDefined();
    await moduleRef.close();
  });
});
