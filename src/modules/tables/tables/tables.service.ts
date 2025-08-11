import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Wszystkie stoliki w restauracji (np. do panelu) */
  async listByRestaurant(restaurantId: number) {
    return this.prisma.table.findMany({
      where: { restaurantId },
      orderBy: [{ seats: 'desc' }, { name: 'asc' }],
    });
  }

  /** Wolne stoliki w oknie [startAt, endAt) – bez kolizji rezerwacji */
  async freeByRestaurant(restaurantId: number, startAt: Date, endAt: Date) {
    return this.prisma.table.findMany({
      where: {
        restaurantId,
        isActive: true,
        reservations: {
          none: {
            reservation: {
              restaurantId,
              NOT: [
                { endAt: { lte: startAt } }, // kończy się PRZED oknem
                { date: { gte: endAt } }, // zaczyna się PO oknie
              ],
            },
          },
        },
      },
      select: {
        id: true,
        seats: true,
        name: true,
        isActive: true,
        restaurantId: true,
      },
      orderBy: [{ seats: 'desc' }, { name: 'asc' }],
    });
  }

  // CRUD (dla admina)
  async getTableById(id: number) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Stolik nie istnieje');
    return table;
  }

  async createTable(data: {
    restaurantId: number;
    seats: number;
    name?: string;
    isActive?: boolean;
  }) {
    return this.prisma.table.create({
      data: {
        restaurantId: data.restaurantId,
        seats: data.seats,
        name: data.name ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateTable(
    id: number,
    data: { seats?: number; name?: string; isActive?: boolean },
  ) {
    const exists = await this.prisma.table.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Stolik nie istnieje');
    return this.prisma.table.update({ where: { id }, data });
  }

  async deleteTable(id: number) {
    const exists = await this.prisma.table.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Stolik nie istnieje');
    return this.prisma.table.delete({ where: { id } });
  }
}
