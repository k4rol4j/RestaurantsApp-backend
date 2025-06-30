import { IsInt, IsString, IsDateString } from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  restaurantId: number;

  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsInt()
  people: number;
}
