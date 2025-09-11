import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
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
  async login(@UserID() userId: number, @Res() res: Response) {
    if (!userId) throw new UnauthorizedException();
    const token = await this.tokenService.createToken(userId);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 godzina
      sameSite: isProd ? 'none' : 'lax',
      secure: true,
    });

    res.cookie('is-logged', true, {
      path: '/',
      maxAge: 60 * 60 * 1000,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });

    res.status(200).send({
      message: 'Login successful',
      access_token: token,
    });
  }

  @Post('logout')
  logout(@Res() res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('access-token', {
      path: '/',
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });
    res.clearCookie('is-logged', {
      path: '/',
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });

    res.status(200).send({
      message: 'Logout successful',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return { id: req.user.id, email: req.user.email, roles: req.user.roles };
  }
}
