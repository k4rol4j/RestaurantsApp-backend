import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';

async function bootstrap() {
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

  // 📁 Ścieżka do folderu public (w dist/public po buildzie)
  const publicPath = join(__dirname, '..', 'public');
  console.log(
    '📁 Serving static assets from:',
    publicPath,
    '| exists:',
    existsSync(publicPath),
  );

  // 🔥 Serwowanie folderu public, np. /images/logo_restaurants/ciao.png
  app.useStaticAssets(publicPath, {
    prefix: '/', // <- NIE /api !
  });

  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);

  const whitelist = [
    'https://restaurantsapp-frontend.onrender.com',
    'http://localhost:5173', // dla testów lokalnych
  ];
  const FALLBACK_ORIGIN = whitelist[0];

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
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
