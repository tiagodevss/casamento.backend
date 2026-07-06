import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true keeps req.rawBody available for HMAC verification in WebhooksModule,
  // since re-serializing the parsed JSON body would break the AbacatePay signature check.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const uploadsDir = process.env.UPLOADS_DIR
    ? resolve(process.env.UPLOADS_DIR)
    : resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  const origins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['webhooks/(.*)', 'health'] });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
