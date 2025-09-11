import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/restaurants')
export class AdminRestaurantsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const [items, total] = await this.admin.listRestaurants(
      q,
      Number(skip),
      Number(take),
    );
    return { items, total };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('restaurants')
  async createRestaurant(@Body() dto: CreateRestaurantDto) {
    return this.prisma.restaurant.create({
      data: {
        name: dto.name,
        location: dto.location,
        cuisine: dto.cuisine,
        rating: dto.rating ?? 0,
        ownerId: dto.ownerId, // ważne! admin wskazuje właściciela
        description: dto.description ?? null,
        capacity: dto.capacity ?? 50,
      },
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteRestaurant(id);
  }
}
