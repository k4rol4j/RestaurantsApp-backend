import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FilterRestaurantsDto } from './dto/filter-restaurants.dto';
import { ReviewRestaurantDto } from './dto/review-restaurant.dto';

type RestaurantBase = Prisma.RestaurantGetPayload<{
  include: {
    address: true;
    cuisines: { include: { cuisine: true } };
    reviews: true;
  };
}>;

type RestaurantComputed = RestaurantBase & {
  avgRating: number | null;
  distance?: number;
};

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableTables(params: {
    restaurantId: number;
    start: Date;
    end: Date;
    people: number;
  }) {
    const { restaurantId, start, end, people } = params;

    const overlapping = await this.prisma.reservationTable.findMany({
      where: {
        reservation: {
          restaurantId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          AND: [{ date: { lt: end } }, { endAt: { gt: start } }],
        },
      },
      select: { tableId: true },
    });

    const busyIds = Array.from(new Set(overlapping.map((r) => r.tableId)));

    return this.prisma.table.findMany({
      where: {
        restaurantId,
        isActive: true,
        seats: people,
        id: busyIds.length ? { notIn: busyIds } : undefined,
      },
      select: { id: true, name: true, seats: true },
      orderBy: [{ seats: 'asc' }, { name: 'asc' }],
    });
  }

  async filterRestaurants(filterDto: FilterRestaurantsDto) {
    const {
      cuisine,
      minRating,
      sortOrder,
      latitude,
      longitude,
      radius,
      sortByDistance,
      date,
      time,
      partySize,
      name,
      location,
    } = filterDto;

    const andConditions: Prisma.RestaurantWhereInput[] = [];

    // 🔍 Nazwa
    if (name) {
      andConditions.push({
        name: { contains: name, mode: 'insensitive' },
      });
    }

    // 📍 Lokalizacja (miasto + wielokrotne dzielnice)
    if (
      location &&
      !(
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        typeof radius === 'number'
      )
    ) {
      const parts = location.split(',').map((x) => x.trim());
      const cityName = parts[0];
      const districts = parts.slice(1);

      if (districts.length > 0) {
        // ⭐ DZIELNICE – TYLKO W WYBRANYM MIEŚCIE
        andConditions.push({
          AND: [
            { address: { city: { equals: cityName, mode: 'insensitive' } } },
            {
              address: {
                district: { in: districts, mode: 'insensitive' },
              },
            },
          ],
        });
      } else {
        // ⭐ SAMO MIASTO — TYLKO DOKŁADNE DOPASOWANIE
        andConditions.push({
          address: {
            city: { equals: cityName, mode: 'insensitive' }, // ← TU ZMIANA
          },
        });
      }
    }

    // 🍽 Kuchnie
    if (cuisine?.length) {
      andConditions.push({
        cuisines: {
          some: {
            cuisine: { name: { in: cuisine } },
          },
        },
      });
    }

    // 🌍 Geolokalizacja
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      radius !== undefined
    ) {
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos((latitude * Math.PI) / 180));

      andConditions.push({
        address: {
          latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
          longitude: { gte: longitude - lonDelta, lte: longitude + lonDelta },
        },
      });
    }

    const where: Prisma.RestaurantWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // ⭐ POBRANIE SUROWYCH DANYCH (bez avgRating)
    const base: RestaurantBase[] = await this.prisma.restaurant.findMany({
      where,
      include: {
        address: true,
        cuisines: { include: { cuisine: true } },
        reviews: true,
      },
    });

    // ⭐ DODANIE avgRating
    let restaurants: RestaurantComputed[] = base.map((r) => {
      const avg =
        r.reviews.length > 0
          ? r.reviews.reduce((s, rev) => s + rev.rating, 0) / r.reviews.length
          : null;

      return { ...r, avgRating: avg };
    });

    // ⭐ Filtr minRating
    if (minRating !== undefined) {
      restaurants = restaurants.filter(
        (r) => r.avgRating !== null && r.avgRating >= minRating,
      );
    }

    // ⭐ Sortowanie po średniej
    if (sortOrder === 'asc') {
      restaurants = restaurants.sort(
        (a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0),
      );
    } else if (sortOrder === 'desc') {
      restaurants = restaurants.sort(
        (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0),
      );
    }

    // ⭐ Sortowanie po dystansie
    if (sortByDistance && latitude !== undefined && longitude !== undefined) {
      restaurants = restaurants
        .map((r) => ({
          ...r,
          distance: this.calculateDistance(
            latitude,
            longitude,
            r.address?.latitude ?? 0,
            r.address?.longitude ?? 0,
          ),
        }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }

    // 🕒 Filtr dostępności (BEZ ZMIAN)
    if (date && time && partySize) {
      const SLOT_DURATION = 120;
      const dayStart = new Date(`${date}T00:00:00`);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);

      const toMin = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
      };

      const slotStart = toMin(time);
      const slotEnd = slotStart + SLOT_DURATION;

      const available: RestaurantComputed[] = [];

      for (const r of restaurants) {
        const within = (opening?: string | null) => {
          if (!opening) return true;
          const m = opening.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
          if (!m) return true;
          const open = toMin(m[1]);
          const close = toMin(m[2]);
          return slotStart >= open && slotStart < close;
        };

        if (!within(r.openingHours)) continue;

        let capacity = r.capacity ?? null;
        if (capacity == null) {
          const sum = await this.prisma.table.aggregate({
            where: { restaurantId: r.id },
            _sum: { seats: true },
          });
          capacity = sum._sum.seats ?? 0;
        }

        const reservations = await this.prisma.reservation.findMany({
          where: {
            restaurantId: r.id,
            date: { gte: dayStart, lt: nextDayStart },
          },
          select: { time: true, people: true, durationMinutes: true },
        });

        let occupied = 0;
        for (const res of reservations) {
          const start = toMin(res.time);
          const end = start + (res.durationMinutes ?? SLOT_DURATION);
          if (start < slotEnd && end > slotStart) occupied += res.people;
        }

        if (capacity - occupied >= partySize) available.push(r);
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

  // 🔹 Teraz z tabeli Cuisine, a nie z Restaurant.cuisine
  async getAvailableCuisines(): Promise<string[]> {
    const cuisines = await this.prisma.cuisine.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    return cuisines.map((c) => c.name);
  }

  // 🔹 Lista restauracji od razu z adresem i kuchniami
  async restaurantsList() {
    return this.prisma.restaurant.findMany({
      include: {
        address: true,
        cuisines: { include: { cuisine: true } },
      },
    });
  }

  async getRestaurantById(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        address: true,
        cuisines: { include: { cuisine: true } },
      },
    });
    if (!restaurant) throw new Error('Restaurant not found');
    return restaurant;
  }

  async searchRestaurants(searchDto: any) {
    const pickString = (v: unknown) =>
      typeof v === 'string'
        ? v.trim()
        : Array.isArray(v)
          ? String(v[0] ?? '').trim()
          : '';

    const name = pickString(searchDto?.name);
    const location = pickString(searchDto?.location);
    const cuisine = pickString(searchDto?.cuisine);

    const toNum = (v: unknown) =>
      v === undefined || v === null || v === '' ? undefined : Number(v);

    const latitude = toNum(searchDto?.latitude);
    const longitude = toNum(searchDto?.longitude);
    const radius = toNum(searchDto?.radius);

    const and: Prisma.RestaurantWhereInput[] = [];

    if (name) {
      and.push({ name: { contains: name, mode: 'insensitive' } });
    }

    // Lokalizacja po Address
    if (
      location &&
      !(
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        typeof radius === 'number'
      )
    ) {
      and.push({
        OR: [
          { address: { city: { contains: location, mode: 'insensitive' } } },
          {
            address: { district: { contains: location, mode: 'insensitive' } },
          },
        ],
      });
    }

    if (cuisine) {
      and.push({
        cuisines: {
          some: {
            cuisine: {
              name: { contains: cuisine, mode: 'insensitive' },
            },
          },
        },
      });
    }

    if (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      typeof radius === 'number'
    ) {
      const latDelta = radius / 111;
      const lonDelta = radius / (111 * Math.cos(latitude * (Math.PI / 180)));

      and.push({
        address: {
          latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
          longitude: { gte: longitude - lonDelta, lte: longitude + lonDelta },
        },
      });
    }

    const where: Prisma.RestaurantWhereInput = and.length ? { AND: and } : {};
    console.log('[SEARCH] where =', JSON.stringify(where));

    // ⭐ POBIERAMY z recenzjami, żeby liczyć średnią
    const raw = await this.prisma.restaurant.findMany({
      where,
      include: {
        address: true,
        cuisines: { include: { cuisine: true } },
        reviews: true,
      },
    });

    // ⭐ LICZENIE ŚREDNIEJ — TERAZ SEARCH TEŻ JĄ MA!
    const withAvg = raw.map((r) => {
      const avg =
        r.reviews.length > 0
          ? r.reviews.reduce((sum, rev) => sum + rev.rating, 0) /
            r.reviews.length
          : null;

      return { ...r, avgRating: avg };
    });

    return withAvg;
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
        address: {
          latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
          longitude: { gte: longitude - lonDelta, lte: longitude + lonDelta },
        },
      },
      include: {
        address: true,
        cuisines: { include: { cuisine: true } },
      },
    });
  }

  getOwned(ownerId: number) {
    return this.prisma.restaurant.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });
  }

  async getDistricts(city: string) {
    const districts = await this.prisma.address.findMany({
      where: { city: { equals: city, mode: 'insensitive' } },
      select: { district: true },
    });

    const unique = Array.from(
      new Set(districts.map((d) => d.district).filter(Boolean)),
    );

    return unique.sort();
  }
}
