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

  // --- Globalny middleware CORS (działa także dla Origin:null i preflight) ---
  express.use((req: Request, res: Response, next) => {
    const reqOrigin = req.headers.origin || FALLBACK_ORIGIN;

    // Ustaw nagłówki na KAŻDE żądanie
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

    if (req.method === 'OPTIONS') {
      // Preflight kończymy tutaj
      return res.sendStatus(204);
    }
    next();
  });

  // --- Standardowe CORS Nest (whitelist + credentials) ---
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // iOS PWA / narzędzia
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
