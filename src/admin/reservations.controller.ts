import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/reservations?from=&to=&status=&userId=&restaurantId=&skip=&take=
  @Get()
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const [items, total] = await this.admin.listReservations({
      from,
      to,
      status,
      userId: userId ? Number(userId) : undefined,
      restaurantId: restaurantId ? Number(restaurantId) : undefined,
      skip: Number(skip),
      take: Number(take),
    });
    return { items, total };
  }

  // PATCH /api/admin/reservations/:id/cancel
  @Delete(':id')
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    await this.admin.deleteReservation(id);
    return { ok: true };
  }
}
