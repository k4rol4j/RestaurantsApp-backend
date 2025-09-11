import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminUsersController } from './users.controller';
import { AdminRestaurantsController } from './restaurants.controller';
import { PrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminUsersController, AdminRestaurantsController],
  providers: [AdminService],
})
export class AdminModule {}
