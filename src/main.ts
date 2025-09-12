// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.use(cookieParser());

  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);

  // Whitelist frontu (lub z ENV FRONTEND_URL="https://foo,https://bar")
  const whitelist = process.env.FRONTEND_URL?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? ['https://restaurantsapp-frontend.onrender.com'];
  const FALLBACK_ORIGIN = whitelist[0];

  // --- Standardowe CORS Nest (whitelist + credentials) ---
  app.enableCors({
    origin: (origin, cb) => {
      // 1) Brak nagłówka Origin (np. curl/postman/same-origin) – OK
      if (!origin) return cb(null, true);

      // 2) PWA / iOS: literalny 'null' – ustaw ACAO na 'null'
      if (origin === 'null') return cb(null, 'null');

      // 3) Biała lista (ENV FRONTEND_URL="https://foo,https://bar")
      if (whitelist.includes(origin)) return cb(null, origin);

      // 4) Reszta – blokada
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await app.listen(process.env.PORT ?? 9000, '0.0.0.0');
}

bootstrap();
