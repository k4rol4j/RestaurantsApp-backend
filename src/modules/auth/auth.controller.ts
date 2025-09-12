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
    res.cookie('access-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 godzina
      sameSite: 'none',
      secure: true,
    });

    res.cookie('is-logged', '1', {
      path: '/',
      maxAge: 60 * 60 * 1000,
      sameSite: 'none',
      secure: true,
    });

    res.status(200).send({
      message: 'Login successful',
      access_token: token,
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
    return { id: req.user.id, email: req.user.email, roles: req.user.roles };
  }

  // 1) Ustaw testowe cookie "probe" (nie httpOnly, żeby było w document.cookie) i zwróć to, co ustawia serwer
  @Get('debug/set-probe')
  setProbe(@Res() res: Response) {
    res.cookie('probe', 'ok', {
      path: '/',
      maxAge: 10 * 60 * 1000,
      sameSite: 'none',
      secure: true,
    });
    res.cookie('access-token-probe', 'x', {
      // DOD. test httpOnly=FALSE
      path: '/',
      maxAge: 10 * 60 * 1000,
      sameSite: 'none',
      secure: true,
      // httpOnly: true  // zostaw domyślne (false), żeby było widoczne w JS
    });
    return res.status(200).json({ message: 'probe-set' });
  }

  // 2) Pokaż co PRZYCHODZI od klienta w ciasteczkach i nagłówkach
  @Get('debug/echo')
  echo(@Req() req) {
    return {
      origin: req.headers.origin || null,
      cookieHeader: req.headers.cookie || null,
      ua: req.headers['user-agent'] || null,
    };
  }
}
