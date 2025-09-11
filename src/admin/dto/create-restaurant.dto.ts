import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsString()
  cuisine: string;

  @IsInt()
  ownerId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  rating?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  capacity?: number;
}
