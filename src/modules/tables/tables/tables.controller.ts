import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { TablesService } from './tables.service';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('restaurant/:restaurantId')
  getTablesByRestaurant(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ) {
    return this.tablesService.getTablesByRestaurant(restaurantId);
  }

  @Get(':id')
  getTableById(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.getTableById(id);
  }

  @Post()
  createTable(
    @Body() body: { restaurantId: number; seats: number; name?: string },
  ) {
    return this.tablesService.createTable(body);
  }

  @Patch(':id')
  updateTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { seats?: number; name?: string; isActive?: boolean },
  ) {
    return this.tablesService.updateTable(id, body);
  }

  @Delete(':id')
  deleteTable(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.deleteTable(id);
  }
}
