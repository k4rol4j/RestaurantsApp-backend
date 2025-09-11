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
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/restaurants')
export class AdminRestaurantsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(
    @Query('q') q = '',
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

  @Post()
  create(@Body() dto: CreateRestaurantDto) {
    return this.admin.createRestaurant(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.admin.deleteRestaurant(id);
  }
}
