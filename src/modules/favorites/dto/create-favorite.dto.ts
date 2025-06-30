import { IsInt } from 'class-validator';

export class CreateFavoriteDto {
  @IsInt()
  restaurantId: number;
}
