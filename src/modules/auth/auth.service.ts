import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async verifyUser(username: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: username },
    });

    // Jeśli użytkownik nie istnieje, zwracamy null
    if (!user) {
      console.log('User not found');
      return null;
    }

    // Sprawdzamy, czy hasło jest poprawne
    const isValid = await argon2.verify(user.password, password);
    console.log('Is password valid?', isValid);

    // Jeśli hasło jest nieprawidłowe, zwracamy null
    if (!isValid) {
      console.log('Invalid password');
      return null;
    }

    // Jeśli wszystko jest w porządku, zwracamy użytkownika
    return user;
  }

  async login(user: User, res: Response) {
    const payload = { sub: user.id, email: user.email, roles: user.roles };
    const token = await this.jwt.signAsync(payload);

    res.cookie('access-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // możesz też zwrócić w body (przydatne do testów Postmanem z Bearer)
    return { access_token: token };
  }
}
