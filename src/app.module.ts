import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from './modules/token/token.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { TablesModule } from './modules/tables/tables/tables.module';
import { OwnerPanelModule } from './modules/owner-panel/owner-panel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RestaurantsModule,
    PrismaModule,
    TokenModule,
    UserModule,
    AuthModule,
    ReservationsModule,
    FavoritesModule,
    TablesModule,
    OwnerPanelModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
