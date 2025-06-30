import { IsInt, IsString, Min, Max, Length } from 'class-validator';

export class AddReviewDto {
  @IsInt()
  restaurantId: number; // ID restauracji, do której dodawana jest recenzja

  @IsInt()
  userId: number; // ID użytkownika, który dodaje recenzję

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number; // Ocena (1 - 5)

  @IsString()
  @Length(1, 500) // Komentarz nie może być pusty i nie dłuższy niż 500 znaków
  comment: string; // Komentarz
}
