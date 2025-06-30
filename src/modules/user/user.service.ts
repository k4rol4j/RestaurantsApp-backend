import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    console.log('Received CreateUserDto:', createUserDto); // Logowanie danych wejściowych

    const passHash = await argon2.hash(createUserDto.password);
    console.log('Hashed Password:', passHash); // Logowanie hasła po zahashowaniu

    try {
      // Tworzenie użytkownika w bazie
      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: passHash,
        },
      });

      console.log('Created user:', user); // Logowanie stworzonego użytkownika
      return user;
    } catch (error) {
      console.error('Error during user creation:', error);

      // Obsługa błędu unikalności e-maila
      if (error.code === 'P2002') {
        throw new ConflictException('Użytkownik z takim emailem już istnieje');
      }

      // Przekazywanie innych błędów
      throw error;
    }
  }

  async findOne(userId: number) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
}
