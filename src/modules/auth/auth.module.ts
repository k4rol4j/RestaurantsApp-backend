import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BasicGuard } from './basic.guard';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { UserModule } from '../user/user.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_KEY,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, BasicGuard, JwtStrategy, PrismaService],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
