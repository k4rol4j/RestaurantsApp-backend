import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { BasicGuard } from './basic.guard';
import { UserID } from './user.decorator';
import { TokenService } from '../token/token.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
      sameSite: 'none',
      secure: true,
    });

    res.cookie('is-logged', true, {
      path: '/',
      maxAge: 60 * 60 * 1000,
      sameSite: 'none',
      secure: true,
    });

    res.status(200).send({
      message: 'Login successful',
    });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access-token', {
      path: '/',
      sameSite: 'none',
      secure: true,
    });
    res.clearCookie('is-logged', {
      path: '/',
      sameSite: 'none',
      secure: true,
    });

    res.status(200).send({
      message: 'Logout successful',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return { id: req.user.sub, email: req.user.email };
  }
}
