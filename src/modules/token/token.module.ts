import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (config: ConfigService) => {
        const secret = config.get('JWT_KEY');
        console.log('JWT_KEY:', secret); // Logowanie sekretu
        return { secret }; // Zwrócenie sekretu
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
