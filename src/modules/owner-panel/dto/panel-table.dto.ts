import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsInt() @Min(1) seats!: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() @Min(1) seats?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
