import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = { sub: number; email: string; roles: string[] };

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async createToken(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, roles: true },
    });
    if (!user) throw new Error('User not found');

    return this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        roles: user.roles ?? [],
      } satisfies JwtPayload,
      { secret: process.env.JWT_KEY, expiresIn: '1h' },
    );
  }

  verifyToken(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token, { secret: process.env.JWT_KEY });
  }
}
