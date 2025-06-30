import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

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
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://restaurantsapp-frontend.onrender.com',
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'], // Dodaj brakujące nagłówki
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Obsługiwane metody
  });

  await app.listen(process.env.PORT ?? 9000);
}
bootstrap();
