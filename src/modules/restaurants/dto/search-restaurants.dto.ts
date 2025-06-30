// dto/search-restaurants.dto.ts
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRestaurantsDto {
  @IsOptional()
  @IsString()
  cuisine?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;
}
