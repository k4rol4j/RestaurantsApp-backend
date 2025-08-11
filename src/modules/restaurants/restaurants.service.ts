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
      sortOrder,
      latitude,
      longitude,
      radius,
      sortByDistance,
      date, // "YYYY-MM-DD"
      time, // "HH:mm"
      partySize, // liczba osób
    } = filterDto;

    const andConditions: Prisma.RestaurantWhereInput[] = [];

    // Kuchnie
    if (cuisine?.length) {
      andConditions.push({
        OR: cuisine.map((c) => ({ cuisine: { contains: c } })),
      });
    }

    // Minimalna ocena
    if (minRating !== undefined) {
      andConditions.push({ rating: { gte: minRating } });
    }

    // Geofiltrowanie
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

    const where: Prisma.RestaurantWhereInput = andConditions.length
      ? { AND: andConditions }
      : {};

    const orderBy: Prisma.RestaurantOrderByWithRelationInput | undefined =
      sortOrder ? { rating: sortOrder } : undefined;

    // 1) Pobierz kandydatów
    let restaurants = await this.prisma.restaurant.findMany({ where, orderBy });

    // 2) Sortowanie po dystansie (opcjonalnie)
    if (sortByDistance && latitude !== undefined && longitude !== undefined) {
      restaurants = restaurants
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((r) => ({
          ...r,
          distance: this.calculateDistance(
            latitude,
            longitude,
            r.latitude!,
            r.longitude!,
          ),
        }))
        .sort((a, b) => a.distance - b.distance);
    }

    // 3) Dostępność (data + godzina + liczba osób)
    // 3) Dostępność (data + godzina + liczba osób)
    // 3) Dostępność (data + godzina + liczba osób)
    if (date && time && partySize) {
      const SLOT_DURATION = 120; // min

      // Zakres dnia do pobrania rezerwacji (unikamy UTC/ISO)
      const dayStart = new Date(`${date}T00:00:00`);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);

      // Minuty w obrębie dnia
      const toMin = (hhmm: string) => {
        const [h, m] = (hhmm ?? '00:00').slice(0, 5).split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      const slotStartMin = toMin(time);
      const slotEndMin = slotStartMin + SLOT_DURATION;

      // (opcjonalnie) godziny otwarcia "HH:mm-HH:mm"
      const withinOpeningHours = (openingHours?: string | null) => {
        if (!openingHours) return true;
        const [open, close] = openingHours.split('-').map((s) => s.trim());
        const openMin = toMin(open);
        const closeMin = toMin(close);
        return slotStartMin >= openMin && slotStartMin < closeMin;
      };

      const available: typeof restaurants = [];

      for (const r of restaurants) {
        if (!withinOpeningHours((r as any).openingHours)) continue;

        // ⬅️ klucz: jeśli capacity brak, nie wycinaj lokalu
        const capacity = r.capacity ?? Number.MAX_SAFE_INTEGER;

        // Rezerwacje tylko z tego dnia (bez ISO/UTC)
        const dayReservations = await this.prisma.reservation.findMany({
          where: {
            restaurantId: r.id,
            date: { gte: dayStart, lt: nextDayStart },
          },
          select: { time: true, people: true, durationMinutes: true },
        });

        // Zlicz zajęte miejsca tylko w nakładającym się slocie
        let used = 0;
        for (const res of dayReservations) {
          const resStartMin = toMin(res.time);
          const resEndMin =
            resStartMin + (res.durationMinutes ?? SLOT_DURATION);
          const overlaps = resStartMin < slotEndMin && resEndMin > slotStartMin;
          if (overlaps) used += res.people ?? 0;
        }

        const free = capacity - used;
        if (free >= partySize) available.push(r);
      }

      restaurants = available;
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
