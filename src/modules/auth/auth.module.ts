import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BasicGuard } from './basic.guard';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService, BasicGuard],
  exports: [AuthService],
})
export class AuthModule {}
