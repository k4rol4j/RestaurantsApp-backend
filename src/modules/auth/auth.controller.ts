import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { BasicGuard } from './basic.guard';
import { UserID } from './user.decorator';
import { TokenService } from '../token/token.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('login')
  @UseGuards(BasicGuard)
  @HttpCode(HttpStatus.OK)
  login(@UserID() userId: number, @Res() res: Response) {
    const token = this.tokenService.createToken(userId);

    res.cookie('access-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 godzina
      sameSite: 'lax',
      secure: false, // WAŻNE: false na localhost
    });

    res.cookie('is-logged', true, {
      path: '/',
      maxAge: 60 * 60 * 1000,
      sameSite: 'lax',
      secure: false,
    });

    res.status(200).send({
      message: 'Login successful',
    });
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access-token');
    res.clearCookie('is-logged');

    // Zakończenie odpowiedzi po usunięciu ciasteczek
    res.status(200).send({
      message: 'Logout successful',
    });
  }
}
