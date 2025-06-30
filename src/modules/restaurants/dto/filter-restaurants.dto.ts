import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterRestaurantsDto {
  @IsOptional()
  @IsString()
  name?: string; // Opcjonalna nazwa restauracji

  @IsOptional()
  @IsString()
  location?: string; // Opcjonalna lokalizacja restauracji

  @IsOptional()
  @IsString({ each: true })
  cuisine?: string[]; // Opcjonalny typ kuchni

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number; // Minimalna ocena (1 - 5)

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  maxRating?: number;

  @IsOptional()
  @IsString()
  availableDate?: string; // Opcjonalna data dostępności w formacie "YYYY-MM-DD"

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  radius?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  sortByDistance?: boolean;
}
