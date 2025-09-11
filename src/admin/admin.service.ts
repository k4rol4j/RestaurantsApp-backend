import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationStatus, Role } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // USERS
  async listUsers(q?: string, skip = 0, take = 20) {
    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where: q ? { email: { contains: q, mode: 'insensitive' } } : undefined,
        select: { id: true, email: true, createdAt: true, roles: true },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({
        where: q ? { email: { contains: q, mode: 'insensitive' } } : undefined,
      }),
    ]);
  }

  async setRoles(userId: number, roles: Role[]) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id: userId }, data: { roles } });
  }

  async changeOneRole(userId: number, role: Role, add: boolean) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    const set = new Set(u.roles ?? []);
    add ? set.add(role) : set.delete(role);
    return this.prisma.user.update({
      where: { id: userId },
      data: { roles: Array.from(set) },
    });
  }

  // RESTAURANTS
  async listRestaurants(q?: string, skip = 0, take = 20) {
    return this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
        select: {
          id: true,
          name: true,
          location: true,
          cuisine: true,
          rating: true,
          ownerId: true,
          owner: { select: { id: true, email: true } },
        },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.restaurant.count({
        where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      }),
    ]);
  }

  async deleteRestaurant(id: number) {
    // hard delete – w MVP. Jeśli chcesz soft-delete, dodamy np. pole deletedAt Boolean/DateTime
    await this.ensureRestaurant(id);
    await this.prisma.reservationTable.deleteMany({
      where: { table: { restaurantId: id } },
    });
    await this.prisma.table.deleteMany({ where: { restaurantId: id } });
    await this.prisma.reservation.deleteMany({ where: { restaurantId: id } });
    await this.prisma.review.deleteMany({ where: { restaurantId: id } });
    return this.prisma.restaurant.delete({ where: { id } });
  }

  private async ensureRestaurant(id: number) {
    const r = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Restaurant not found');
    return r;
  }

  // RESERVATIONS
  async listReservations(opts: {
    from?: Date;
    to?: Date;
    status?: ReservationStatus;
    userId?: number;
    restaurantId?: number;
    skip?: number;
    take?: number;
  }) {
    const {
      from,
      to,
      status,
      userId,
      restaurantId,
      skip = 0,
      take = 20,
    } = opts;
    return this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where: {
          status: status ?? undefined,
          userId: userId ?? undefined,
          restaurantId: restaurantId ?? undefined,
          date: { gte: from ?? undefined, lte: to ?? undefined },
        },
        orderBy: { date: 'desc' },
        skip,
        take,
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
      this.prisma.reservation.count({
        where: {
          status: status ?? undefined,
          userId: userId ?? undefined,
          restaurantId: restaurantId ?? undefined,
          date: { gte: from ?? undefined, lte: to ?? undefined },
        },
      }),
    ]);
  }

  async cancelReservation(id: number) {
    const res = await this.prisma.reservation.findUnique({ where: { id } });
    if (!res) throw new NotFoundException('Reservation not found');
    if (res.status === 'CANCELLED') return res;

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // REVIEWS
  async listReviews(opts: {
    userId?: number;
    restaurantId?: number;
    skip?: number;
    take?: number;
  }) {
    const { userId, restaurantId, skip = 0, take = 20 } = opts;
    return this.prisma.$transaction([
      this.prisma.review.findMany({
        where: {
          userId: userId ?? undefined,
          restaurantId: restaurantId ?? undefined,
        },
        orderBy: { id: 'desc' },
        skip,
        take,
        select: {
          id: true,
          rating: true,
          comment: true,
          date: true,
          user: { select: { id: true, email: true } },
          restaurant: { select: { id: true, name: true } },
          reservationId: true,
        },
      }),
      this.prisma.review.count({
        where: {
          userId: userId ?? undefined,
          restaurantId: restaurantId ?? undefined,
        },
      }),
    ]);
  }

  async deleteReview(id: number) {
    const rev = await this.prisma.review.findUnique({ where: { id } });
    if (!rev) throw new NotFoundException('Review not found');
    return this.prisma.review.delete({ where: { id } });
  }
}
