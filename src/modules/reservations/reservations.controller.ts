import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { TokenGuard } from '../auth/token-guard';
import { UserID } from '../auth/user.decorator';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(TokenGuard)
  async makeReservation(
    @Body() dto: CreateReservationDto,
    @UserID() userId: number,
  ) {
    return this.reservationsService.createReservation(dto, userId);
  }

  @Get('my')
  @UseGuards(TokenGuard)
  async getMyReservations(@UserID() userId: number) {
    return this.reservationsService.getReservationsByUser(userId);
  }

  @UseGuards(TokenGuard)
  @Delete(':id')
  async cancelReservation(@Param('id') id: string, @UserID() userId: number) {
    return this.reservationsService.cancelReservation(Number(id), userId);
  }
}
