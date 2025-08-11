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
    if (date && time && partySize) {
      // Domyślna długość rezerwacji, jeśli rekordy nie mają ustawionego durationMinutes
      const DEFAULT_DURATION = 120;

      // Budujemy zakres slotu użytkownika
      const slotStart = new Date(`${date}T${time}:00`);
      const slotDurationMin = DEFAULT_DURATION; // możesz też dodać do DTO jeśli ma być zmienne
      const slotEnd = new Date(
        slotStart.getTime() + slotDurationMin * 60 * 1000,
      );

      // Helper do sprawdzania godzin otwarcia w formacie "HH:mm-HH:mm" (opcjonalnie)
      const withinOpeningHours = (openingHours?: string | null) => {
        if (!openingHours) return true;
        const [open, close] = openingHours.split('-').map((s) => s.trim());
        const toMin = (hhmm: string) => {
          const [h, m] = hhmm.split(':').map(Number);
          return h * 60 + m;
        };
        const [h, m] = time.split(':').map(Number);
        const tMin = h * 60 + m;
        return tMin >= toMin(open) && tMin < toMin(close);
      };

      const available: typeof restaurants = [];

      for (const r of restaurants) {
        if (!withinOpeningHours(r.openingHours)) continue;

        // Pobierz sumę osób dla rezerwacji, które NAKŁADAJĄ się ze slotem
        // Ponieważ masz osobno date i time, zrobimy okno:
        // - tylko ten sam dzień
        // - rezerwacje, których [resStart, resEnd) przecina [slotStart, slotEnd)

        // Dolna granica startów, które mogą wejść w konflikt:
        const overlapWindowStart = new Date(
          slotStart.getTime() - slotDurationMin * 60 * 1000,
        );

        // Sprowadzamy porównania do tego samego dnia:
        const dayStart = new Date(`${date}T00:00:00`);
        const nextDayStart = new Date(`${date}T00:00:00`);
        nextDayStart.setDate(nextDayStart.getDate() + 1);

        // bierzemy wszystkie rezerwacje z TEGO dnia,
        // a w warstwie aplikacyjnej odfiltrujemy te bez nakładania czasowego.
        const dayReservations = await this.prisma.reservation.findMany({
          where: {
            restaurantId: r.id,
            date: { gte: dayStart, lt: nextDayStart },
          },
          select: {
            time: true,
            people: true,
            durationMinutes: true,
            endAt: true,
          },
        });

        // policz zajęte miejsca w slocie
        let used = 0;
        for (const res of dayReservations) {
          // zbuduj daty start/end rezerwacji
          const resStart = new Date(`${date}T${res.time}:00`);
          const resDuration = res.durationMinutes ?? DEFAULT_DURATION;
          const resEnd = res.endAt
            ? new Date(res.endAt)
            : new Date(resStart.getTime() + resDuration * 60 * 1000);

          const overlap = resStart < slotEnd && resEnd > slotStart;
          if (overlap) {
            used += res.people ?? 0;
          }
        }

        const free = (r.capacity ?? 0) - used;
        if (free >= partySize) {
          available.push(r);
        }
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
