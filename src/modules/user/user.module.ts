import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Importujemy moduł Prisma

@Module({
  imports: [PrismaModule], // Import PrismaModule (lub innego modułu zawierającego PrismaService)
  controllers: [UserController], // Rejestracja kontrolera
  providers: [UserService], // Rejestracja serwisu
})
export class UserModule {}
