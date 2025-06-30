import { IsString, IsDateString, Matches } from 'class-validator';

export class CheckAvailabilityDto {
  @IsString()
  restaurantId: string; // ID restauracji (jeśli to string)

  @IsDateString()
  date: string; // Data w formacie "YYYY-MM-DD"

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'Time must be in HH:mm format',
  })
  time: string; // Czas w formacie HH:mm
}
