import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TablesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTablesByRestaurant(restaurantId: number) {
    return this.prisma.table.findMany({
      where: { restaurantId },
      orderBy: { seats: 'asc' },
    });
  }

  async getTableById(id: number) {
    const table = await this.prisma.table.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Stolik nie istnieje');
    return table;
  }

  async createTable(data: {
    restaurantId: number;
    seats: number;
    name?: string;
  }) {
    return this.prisma.table.create({
      data: {
        restaurantId: data.restaurantId,
        seats: data.seats,
        name: data.name ?? null,
      },
    });
  }

  async updateTable(
    id: number,
    data: { seats?: number; name?: string; isActive?: boolean },
  ) {
    return this.prisma.table.update({
      where: { id },
      data,
    });
  }

  async deleteTable(id: number) {
    return this.prisma.table.delete({ where: { id } });
  }
}
