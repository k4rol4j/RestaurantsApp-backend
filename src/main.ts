// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // 👇 używamy NestExpressApplication, żeby serwować statyczne pliki
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser());

  // 👇 Dzięki temu backend będzie serwował pliki z folderu /public
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/', // oznacza, że pliki będą dostępne np. pod /images/logo_restaurants/ciao.png
  });

  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);

  // 🔒 Whitelist frontu
  const whitelist = process.env.FRONTEND_URL?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? ['https://restaurantsapp-frontend.onrender.com'];

  const FALLBACK_ORIGIN = whitelist[0];

  // ✅ CORS
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // np. Postman / SSR
      if (origin === 'null') return cb(null, FALLBACK_ORIGIN);
      if (whitelist.includes(origin)) return cb(null, origin);
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await app.listen(process.env.PORT ?? 9000, '0.0.0.0');
}

bootstrap();
