import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterRestaurantsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString({ each: true })
  cuisine?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number; // Minimalna ocena (1 - 5)

  @IsOptional()
  @IsDateString()
  date?: string; // "YYYY-MM-DD"

  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'time must be HH:mm',
  })
  time?: string; // "HH:mm"

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  partySize?: number; // liczba osób

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
