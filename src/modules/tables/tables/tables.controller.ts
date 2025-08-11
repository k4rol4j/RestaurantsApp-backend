import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  BadRequestException,
  Post,
  Patch,
  Delete,
  Body,
} from '@nestjs/common';
import { TablesService } from './tables.service';

function normalizeTime(t: string) {
  const [h, m = '00'] = (t ?? '').split(':');
  const hh = String(Number(h)).padStart(2, '0');
  const mm = String(Number(m)).padStart(2, '0');
  if (Number.isNaN(Number(h)) || Number.isNaN(Number(m))) {
    throw new BadRequestException('Nieprawidłowy format godziny (HH:mm)');
  }
  return `${hh}:${mm}`;
}

@Controller()
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  /** Pełna lista stolików restauracji */
  @Get('restaurants/:restaurantId/tables')
  listByRestaurant(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.tables.listByRestaurant(restaurantId);
  }

  /**
   * Wolne stoliki w oknie:
   * GET /restaurants/:restaurantId/tables/free?date=YYYY-MM-DD&time=HH:mm&durationMinutes=90
   */
  @Get('restaurants/:restaurantId/tables/free')
  async freeByRestaurant(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('date') date: string,
    @Query('time') time: string,
    @Query('durationMinutes') durationMinutes = '90',
  ) {
    if (!date || !time) {
      throw new BadRequestException('Wymagane parametry: date, time');
    }
    const tNorm = normalizeTime(time);

    const startAt = new Date(date);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Nieprawidłowa data');
    }
    const [h, m] = tNorm.split(':').map(Number);
    startAt.setHours(h, m, 0, 0);

    const dur = Number(durationMinutes);
    if (!Number.isFinite(dur) || dur <= 0) {
      throw new BadRequestException('durationMinutes musi być dodatnią liczbą');
    }
    const endAt = new Date(startAt.getTime() + dur * 60 * 1000);

    return this.tables.freeByRestaurant(restaurantId, startAt, endAt);
  }

  // --- CRUD pod /tables (np. do panelu admina) ---

  @Get('tables/:id')
  getTableById(@Param('id', ParseIntPipe) id: number) {
    return this.tables.getTableById(id);
  }

  @Post('tables')
  createTable(
    @Body()
    body: {
      restaurantId: number;
      seats: number;
      name?: string;
      isActive?: boolean;
    },
  ) {
    return this.tables.createTable(body);
  }

  @Patch('tables/:id')
  updateTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { seats?: number; name?: string; isActive?: boolean },
  ) {
    return this.tables.updateTable(id, body);
  }

  @Delete('tables/:id')
  deleteTable(@Param('id', ParseIntPipe) id: number) {
    return this.tables.deleteTable(id);
  }
}
