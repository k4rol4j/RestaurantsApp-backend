import {
  IsInt,
  IsString,
  IsDateString,
  Min,
  IsOptional,
} from 'class-validator';

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

  @IsInt()
  @Min(30)
  @IsOptional()
  durationMinutes?: number;

  tableId?: number;
}
