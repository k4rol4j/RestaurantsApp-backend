import { IsInt, IsString, IsDateString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  restaurantId: number;

  @IsDateString()
  date: string;

  @IsString()
  time: string;

  @IsInt()
  @Min(1)
  people: number;
}
