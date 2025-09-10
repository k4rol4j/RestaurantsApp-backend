import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OwnerPanelService } from './owner-panel.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RestaurantOwnerGuard } from './restaurant-owner.guard'; // ← dostosuj ścieżkę jeśli trzymasz guard w innym folderze
import {
  ListReservationsQueryDto,
  SetReservationStatusDto,
  AssignTableDto,
} from './dto/panel-reservations.dto';
import { CreateTableDto, UpdateTableDto } from './dto/panel-table.dto';
import { UpdateRestaurantProfileDto } from './dto/update-restaurant-profile.dto';

@UseGuards(JwtAuthGuard, RestaurantOwnerGuard)
@Controller('restaurants/:restaurantId/panel')
export class OwnerPanelController {
  constructor(private readonly service: OwnerPanelService) {}

  // DASHBOARD
  @Get('dashboard')
  dashboard(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.service.getDashboard(restaurantId);
  }

  // PROFIL
  @Get('profile')
  getProfile(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.service.getProfile(restaurantId);
  }

  @Patch('profile')
  updateProfile(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: UpdateRestaurantProfileDto,
  ) {
    return this.service.updateProfile(restaurantId, dto);
  }

  // STOŁY
  @Get('tables')
  listTables(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.service.getTables(restaurantId);
  }

  @Post('tables')
  createTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: CreateTableDto,
  ) {
    return this.service.createTable(restaurantId, dto);
  }

  @Patch('tables/:tableId')
  updateTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body() dto: UpdateTableDto,
  ) {
    return this.service.updateTable(restaurantId, tableId, dto);
  }

  // REZERWACJE
  @Get('reservations')
  listReservations(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Query() q: ListReservationsQueryDto,
  ) {
    return this.service.listReservations(restaurantId, q);
  }

  @Patch('reservations/:reservationId/status')
  setStatus(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() body: SetReservationStatusDto,
  ) {
    return this.service.setReservationStatus(
      restaurantId,
      reservationId,
      body.status,
    );
  }

  @Post('reservations/:reservationId/assign-table')
  assignTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() body: AssignTableDto,
  ) {
    return this.service.assignTable(restaurantId, reservationId, body.tableId);
  }

  @Post('reservations/:reservationId/unassign-table')
  unassignTable(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() body: AssignTableDto,
  ) {
    return this.service.unassignTable(
      restaurantId,
      reservationId,
      body.tableId,
    );
  }

  @Patch(':id/panel/profile')
  @UseGuards(JwtAuthGuard, RestaurantOwnerGuard)
  updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantProfileDto,
  ) {
    return this.service.updateProfile(id, dto);
  }
}
