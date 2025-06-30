import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(userId: number, restaurantId: number) {
    return this.prisma.favorite.create({
      data: {
        userId,
        restaurantId,
      },
    });
  }

  async removeFavorite(userId: number, restaurantId: number) {
    return this.prisma.favorite.delete({
      where: {
        userId_restaurantId: { userId, restaurantId },
      },
    });
  }

  async getUserFavorites(userId: number) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { restaurant: true },
    });
  }

  async isFavorite(userId: number, restaurantId: number) {
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_restaurantId: { userId, restaurantId } },
    });
    return !!favorite;
  }
}
