import { IsInt, IsString, Min, Max, Length } from 'class-validator';

export class ReviewRestaurantDto {
  @IsInt()
  restaurantId: number;

  @IsInt()
  reservationId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @Length(1, 500)
  comment: string;
}
