import { Module } from '@nestjs/common';
import { OwnerPanelController } from './owner-panel.controller';
import { OwnerPanelService } from './owner-panel.service';
import { PrismaService } from '../prisma/prisma.service';
import { RestaurantOwnerGuard } from './restaurant-owner.guard';

@Module({
  controllers: [OwnerPanelController],
  providers: [OwnerPanelService, PrismaService, RestaurantOwnerGuard],
})
export class OwnerPanelModule {}
