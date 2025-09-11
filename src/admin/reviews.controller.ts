import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(
    @Query('userId') userId?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const [items, total] = await this.admin.listReviews({
      userId: userId ? Number(userId) : undefined,
      restaurantId: restaurantId ? Number(restaurantId) : undefined,
      skip: Number(skip),
      take: Number(take),
    });
    return { items, total };
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteReview(id);
  }
}
