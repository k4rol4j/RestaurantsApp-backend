import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  ConflictException,
  Get,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dto/user.dto';
import { TokenGuard } from '../auth/token-guard';
import { UserID } from '../auth/user.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post() // Endpoint do tworzenia użytkownika
  async createUser(@Body() createUserDto: CreateUserDto) {
    try {
      console.log('Received data:', createUserDto); // Logowanie danych
      const user = await this.userService.create(createUserDto); // Tworzenie użytkownika
      return plainToInstance(UserDto, user); // Zwracanie użytkownika
    } catch (error) {
      console.error('Error in createUser controller:', error);

      if (error instanceof ConflictException) {
        // Jeśli wystąpił błąd konfliktu, zwróć 409
        throw new HttpException(error.message, HttpStatus.CONFLICT);
      }

      // W przypadku innych błędów, zwróć błąd 500
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/me')
  @UseGuards(TokenGuard)
  async me(@UserID() userId: number) {
    const user = await this.userService.findOne(userId);
    return plainToInstance(UserDto, user);
  }
}
