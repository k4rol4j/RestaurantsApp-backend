import { Controller, UseGuards } from '@nestjs/common';
import { RestaurantOwnerGuard } from './restaurant-owner.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RestaurantOwnerGuard)
@Controller('owner-panel')
export class OwnerPanelController {}
