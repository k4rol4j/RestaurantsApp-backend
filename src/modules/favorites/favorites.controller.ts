import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { TokenGuard } from '../auth/token-guard';
import { UserID } from '../auth/user.decorator';

@Controller('favorites')
@UseGuards(TokenGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':restaurantId')
  addFavorite(
    @UserID() userId: number,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.favoritesService.addFavorite(userId, Number(restaurantId));
  }

  @Delete(':restaurantId')
  removeFavorite(
    @UserID() userId: number,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.favoritesService.removeFavorite(userId, Number(restaurantId));
  }

  @Get()
  getFavorites(@UserID() userId: number) {
    return this.favoritesService.getUserFavorites(userId);
  }

  @Get(':restaurantId')
  isFavorite(
    @UserID() userId: number,
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.favoritesService.isFavorite(userId, Number(restaurantId));
  }
}
