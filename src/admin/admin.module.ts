import { Module } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { AdminService } from './admin.service';
import { AdminReviewsController } from './reviews.controller';
import { AdminUsersController } from './users.controller';
import { AdminRestaurantsController } from './restaurants.controller';
import { AdminReservationsController } from './reservations.controller';

@Module({
  controllers: [
    AdminUsersController,
    AdminRestaurantsController,
    AdminReservationsController,
    AdminReviewsController,
  ],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
