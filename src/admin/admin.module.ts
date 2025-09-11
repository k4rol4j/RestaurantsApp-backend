import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUsersController } from './users.controller';
import { AdminRestaurantsController } from './restaurants.controller';
import { AdminReservationsController } from './reservations.controller';
import { AdminReviewsController } from './reviews.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminUsersController,
    AdminRestaurantsController,
    AdminReservationsController,
    AdminReviewsController,
  ],
  providers: [AdminService],
})
export class AdminModule {}
