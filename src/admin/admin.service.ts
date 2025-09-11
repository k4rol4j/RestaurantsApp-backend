import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // --- USERS ---
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

  // --- RESTAURANTS (masz już, przykład) ---
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
    return this.prisma.restaurant.create({
      data: {
        name: dto.name,
        location: dto.location,
        cuisine: dto.cuisine,
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
  }

  async deleteRestaurant(id: number) {
    return this.prisma.restaurant.delete({ where: { id } });
  }
}
