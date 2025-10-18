import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ---------------- USERS ----------------
  async listUsers(q = '', skip = 0, take = 20) {
    const where = q
      ? { email: { contains: q, mode: 'insensitive' as const } }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, createdAt: true, roles: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return [items, total] as const;
  }

  async toggleOneRole(
    userId: number,
    role: 'ADMIN' | 'RESTAURANT_OWNER' | 'USER',
    add: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });
    const set = new Set(user?.roles ?? []);
    if (add) set.add(role);
    else set.delete(role);
    return this.prisma.user.update({
      where: { id: userId },
      data: { roles: { set: Array.from(set) } },
      select: { id: true, email: true, roles: true },
    });
  }

  async setRoles(
    userId: number,
    roles: ('ADMIN' | 'RESTAURANT_OWNER' | 'USER')[],
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roles: { set: roles } },
      select: { id: true, email: true, roles: true },
    });
  }

  // -------------- RESTAURANTS --------------
  async listRestaurants(q = '', skip = 0, take = 20) {
    const where = q
      ? { name: { contains: q, mode: 'insensitive' as const } }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.restaurant.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          name: true,
          location: true,
          cuisine: true,
          rating: true,
          ownerId: true,
          owner: { select: { id: true, email: true } },
        },
      }),
      this.prisma.restaurant.count({ where }),
    ]);
    return [items, total] as const;
  }

  async createRestaurant(dto: {
    name: string;
    location: string;
    cuisine: string;
    ownerId: number;
    capacity?: number;
    rating?: number;
    description?: string;
  }) {
    // 1) Owner MUSI istnieć
    const owner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId },
      select: { roles: true },
    });
    if (!owner) {
      throw new NotFoundException('Właściciel (ownerId) nie istnieje');
    }

    // 2) (opcjonalnie) dopisz rolę OWNER, jeśli jej nie ma
    if (!owner.roles.includes('RESTAURANT_OWNER')) {
      await this.prisma.user.update({
        where: { id: dto.ownerId },
        data: {
          roles: {
            set: Array.from(new Set([...owner.roles, 'RESTAURANT_OWNER'])),
          },
        },
      });
    }

    // 3) Tworzenie + czytelne błędy
    try {
      return await this.prisma.restaurant.create({
        data: {
          name: dto.name.trim(),
          location: dto.location.trim(),
          cuisine: dto.cuisine.trim(),
          ownerId: dto.ownerId,
          capacity: dto.capacity ?? 50,
          rating: dto.rating ?? 0,
          description: dto.description ?? null,
        },
        select: {
          id: true,
          name: true,
          location: true,
          cuisine: true,
          rating: true,
          ownerId: true,
          owner: { select: { id: true, email: true } },
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = Array.isArray((e.meta as any)?.target)
          ? (e.meta as any).target.join(', ')
          : String((e.meta as any)?.target ?? '');
        throw new BadRequestException(
          `Konflikt unikalności dla: ${target || 'nieznane pole'}`,
        );
      }
    }
  }

  async deleteRestaurant(id: number) {
    return this.prisma.restaurant.delete({ where: { id } });
  }

  // -------------- RESERVATIONS --------------
  async listReservations(params: {
    from?: string; // 'YYYY-MM-DD'
    to?: string; // 'YYYY-MM-DD'
    status?: ReservationStatus | string;
    userId?: number;
    restaurantId?: number;
    skip?: number;
    take?: number;
  }) {
    const { from, to, status, userId, restaurantId } = params;
    const skip = params.skip ?? 0;
    const take = params.take ?? 20;

    const where: any = {};
    if (from) where.date = { ...(where.date || {}), gte: new Date(from) };
    if (to) where.date = { ...(where.date || {}), lte: new Date(to) };
    if (status) where.status = status as ReservationStatus;
    if (userId) where.userId = userId;
    if (restaurantId) where.restaurantId = restaurantId;

    const [items, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          date: true,
          time: true,
          people: true,
          durationMinutes: true,
          endAt: true,
          status: true,
          user: { select: { id: true, email: true } },
          restaurant: { select: { id: true, name: true } },
          tables: {
            select: {
              table: { select: { id: true, name: true, seats: true } },
            },
          },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return [items, total] as const;
  }

  async deleteReservation(id: number) {
    // usuń ewentualną recenzję powiązaną FK (reservationId jest unique w Review)
    await this.prisma.review.deleteMany({ where: { reservationId: id } });
    // dla pewności usuń też powiązania stolików (mimo onDelete: Cascade)
    await this.prisma.reservationTable.deleteMany({
      where: { reservationId: id },
    });
    await this.prisma.reservation.delete({ where: { id } });
  }

  // -------------- REVIEWS --------------
  async listReviews(params: {
    restaurantId?: number;
    userId?: number;
    skip?: number;
    take?: number;
  }) {
    const { restaurantId, userId } = params;
    const skip = params.skip ?? 0;
    const take = params.take ?? 100;

    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          rating: true,
          comment: true,
          date: true,
          reservationId: true,
          user: { select: { id: true, email: true } },
          restaurant: { select: { id: true, name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return [items, total] as const;
  }

  async deleteReview(id: number) {
    return this.prisma.review.delete({ where: { id } });
  }

  async cancelReservation(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async restoreReservation(id: number) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Reservation not found');

    if (r.status !== 'CANCELLED') {
      throw new BadRequestException(
        'Only cancelled reservations can be restored',
      );
    }

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }
}
