// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // /api/... jako prefix
  app.setGlobalPrefix('api');

  // Walidacja
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Cookies
  app.use(cookieParser());

  // Express adapter (np. do preflight)
  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);

  // Whitelist frontów (z .env FRONTEND_URL="https://foo,https://bar")
  const whitelist = process.env.FRONTEND_URL?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? ['https://restaurantsapp-frontend.onrender.com'];

  const FALLBACK_ORIGIN = whitelist[0];

  // --- 1) TWARDY PRE-FLIGHT: odpowiadamy na OPTIONS zawsze z właściwymi nagłówkami ---
  express.options('*', (req: Request, res: Response) => {
    // iOS PWA często wysyła Origin: null — wtedy używamy FALLBACK_ORIGIN
    const reqOrigin = req.headers.origin || FALLBACK_ORIGIN;

    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin'); // ważne przy dynamicznym origin
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With',
    );
    res.sendStatus(204);
  });

  // --- 2) Standardowe CORS dla zwykłych żądań ---
  app.enableCors({
    origin: (origin, cb) => {
      // iOS PWA / narzędzia / healthchecks: Origin bywa null -> zezwalamy
      if (!origin) return cb(null, true);
      if (whitelist.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await app.listen(process.env.PORT ?? 9000, '0.0.0.0');
}

bootstrap();
