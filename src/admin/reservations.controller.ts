import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { ReservationStatus } from '@prisma/client';
import { CancelReservationDto } from './dto/cancel-reservation.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: ReservationStatus,
    @Query('userId') userId?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const [items, total] = await this.admin.listReservations({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status: status,
      userId: userId ? Number(userId) : undefined,
      restaurantId: restaurantId ? Number(restaurantId) : undefined,
      skip: Number(skip),
      take: Number(take),
    });
    return { items, total };
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() _dto: CancelReservationDto,
  ) {
    return this.admin.cancelReservation(id); // reason ignorujemy w MVP
  }
}
