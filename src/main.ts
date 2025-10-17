import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // ✅ Public folder (np. /images/logo_restaurants)
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });

  // ✅ Globalne walidacje DTO
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 🔧 CORS KONFIG
  const whitelist = [
    'https://restaurantsapp-frontend.onrender.com',
    'http://localhost:5173', // dla testów lokalnych
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / Postman
      if (whitelist.includes(origin)) return callback(null, origin);
      console.warn('❌ Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  });

  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 9000, '0.0.0.0');
}
bootstrap();
