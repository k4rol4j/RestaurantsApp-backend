import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  ownerId: number;

  // 🔹 nowe pola adresu
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  // 🔹 kuchnia (jako nazwa kategorii)
  @IsString()
  @IsNotEmpty()
  cuisine: string;

  // 🔹 opcjonalne
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
