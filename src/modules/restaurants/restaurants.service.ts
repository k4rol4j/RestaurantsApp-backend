import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FilterRestaurantsDto } from './dto/filter-restaurants.dto';
import { ReviewRestaurantDto } from './dto/review-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async filterRestaurants(filterDto: FilterRestaurantsDto) {
    const {
      cuisine,
      minRating,
      maxRating,
      availableDate,
      sortOrder,
      latitude,
      longitude,
      radius,
      sortByDistance,
    } = filterDto;

    const andConditions: Prisma.RestaurantWhereInput[] = [];

    if (cuisine && cuisine.length > 0) {
      andConditions.push({
        OR: cuisine.map((c) => ({
          cuisine: { contains: c },
        })),
      });
    }

    if (minRating !== undefined && maxRating !== undefined) {
      andConditions.push({
        rating: { gte: minRating, lte: maxRating },
      });
    } else if (minRating !== undefined) {
      andConditions.push({
        rating: { gte: minRating },
      });
    } else if (maxRating !== undefined) {
      andConditions.push({
        rating: { lte: maxRating },
      });
    }

    if (availableDate) {
      andConditions.push({
        reservations: { none: { date: availableDate } },
      });
    }

    if (
      latitude !== undefined &&
      longitude !== undefined &&
      radius !== undefined
    ) {
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos(latitude * (Math.PI / 180)));

      andConditions.push({
        latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { gte: longitude - lonDelta, lte: longitude + lonDelta },
      });
    }

    const where: Prisma.RestaurantWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const orderBy: Prisma.RestaurantOrderByWithRelationInput | undefined =
      sortOrder ? { rating: sortOrder } : undefined;

    let restaurants = await this.prisma.restaurant.findMany({
      where,
      orderBy,
    });

    if (sortByDistance && latitude !== undefined && longitude !== undefined) {
      restaurants = restaurants
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((restaurant) => ({
          ...restaurant,
          distance: this.calculateDistance(
            latitude,
            longitude,
            restaurant.latitude!,
            restaurant.longitude!,
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    return restaurants;
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getAvailableCuisines(): Promise<string[]> {
    const cuisines = await this.prisma.restaurant.findMany({
      select: { cuisine: true },
      distinct: ['cuisine'],
    });
    return cuisines.map((r) => r.cuisine);
  }

  async restaurantsList() {
    return this.prisma.restaurant.findMany();
  }

  async getRestaurantById(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new Error('Restaurant not found');
    return restaurant;
  }

  async searchRestaurants(searchDto: any) {
    const { location, name, cuisine, latitude, longitude, radius } = searchDto;
    const andConditions: Prisma.RestaurantWhereInput[] = [];

    if (location && !(latitude && longitude && radius)) {
      andConditions.push({
        location: { contains: location },
      });
    }
    if (name) {
      andConditions.push({
        name: { contains: name },
      });
    }
    if (cuisine) {
      andConditions.push({
        cuisine: { contains: cuisine },
      });
    }

    if (
      latitude !== undefined &&
      longitude !== undefined &&
      radius !== undefined
    ) {
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos(latitude * (Math.PI / 180)));

      andConditions.push({
        latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { gte: longitude - lonDelta, lte: longitude + lonDelta },
      });
    }

    const where: Prisma.RestaurantWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    return this.prisma.restaurant.findMany({ where });
  }

  async reviewRestaurants(restaurantId: number) {
    return this.prisma.review.findMany({
      where: { restaurantId },
    });
  }

  async canUserReviewRestaurant(userId: number, restaurantId: number) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { userId, restaurantId, date: { lt: new Date() } },
    });
    return !!reservation;
  }

  async addReviews(reviewDto: ReviewRestaurantDto, userId: number) {
    const { restaurantId, reservationId, rating, comment } = reviewDto;

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        restaurantId,
        userId,
        date: { lt: new Date() },
      },
    });

    if (!reservation) {
      throw new ForbiddenException(
        'Nie możesz dodać opinii bez przeszłej rezerwacji.',
      );
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { reservationId },
    });

    if (existingReview) {
      throw new ForbiddenException('Opinia dla tej rezerwacji już istnieje.');
    }

    return this.prisma.review.create({
      data: {
        restaurantId,
        userId,
        reservationId,
        rating,
        comment,
        date: new Date(),
      },
    });
  }

  async findNearbyRestaurants({
    latitude,
    longitude,
    radius,
  }: {
    latitude: number;
    longitude: number;
    radius: number;
  }) {
    const latDelta = radius / 111;
    const lonDelta = radius / (111 * Math.cos(latitude * (Math.PI / 180)));

    return this.prisma.restaurant.findMany({
      where: {
        latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { gte: longitude - lonDelta, lte: longitude + lonDelta },
      },
    });
  }
}
