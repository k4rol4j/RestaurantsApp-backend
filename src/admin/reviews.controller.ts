import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/reviews?restaurantId=&userId=&skip=&take=
  @Get()
  async list(
    @Query('restaurantId') restaurantId?: string,
    @Query('userId') userId?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const [items, total] = await this.admin.listReviews({
      restaurantId: restaurantId ? Number(restaurantId) : undefined,
      userId: userId ? Number(userId) : undefined,
      skip: Number(skip),
      take: Number(take),
    });
    return { items, total };
  }

  // DELETE /api/admin/reviews/:id
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteReview(id);
  }
}
