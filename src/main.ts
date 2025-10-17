import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

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

  // 🔥 To jest najważniejsze — musi być PRZED listen()
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/', // dzięki temu /images/... działa
  });

  const express = app.getHttpAdapter().getInstance();
  express.set('trust proxy', 1);

  const whitelist = ['https://restaurantsapp-frontend.onrender.com'];
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
