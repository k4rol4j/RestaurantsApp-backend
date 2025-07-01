import { Controller, Post, Body } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() body: any) {
    // Tymczasowo:
    console.log('Login request received:', body);
    return { message: 'Login successful (stub)', received: body };
  }
}
