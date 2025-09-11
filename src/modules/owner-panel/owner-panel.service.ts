import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as dayjs from 'dayjs';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type MenuItem = {
  name: string;
  price: number;
  category?: string;
  description?: string;
  isAvailable?: boolean;
};

function cleanItem(x: Partial<MenuItem>): MenuItem {
  const name = (x.name ?? '').toString().trim();
  const price = Number(x.price ?? 0);
  if (!name) throw new BadRequestException('Menu item name is required');
  if (Number.isNaN(price) || price < 0)
    throw new BadRequestException('Menu item price must be >= 0');

  return {
    name,
    price,
    category: (x.category ?? '').toString().trim() || undefined,
    description: (x.description ?? '').toString().trim() || undefined,
    isAvailable: x.isAvailable ?? true,
  };
}

@Injectable()
export class OwnerPanelService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(restaurantId: number) {
    const r = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!r) throw new NotFoundException();

    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const tomorrowStart = dayjs().add(1, 'day').startOf('day').toDate();
    const tomorrowEnd = dayjs().add(1, 'day').endOf('day').toDate();

    const [today, tomorrow] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          restaurantId,
          date: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          time: true,
          people: true,
          status: true,
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          restaurantId,
          date: { gte: tomorrowStart, lte: tomorrowEnd },
          status: { notIn: ['CANCELLED', 'REJECTED'] },
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          time: true,
          people: true,
          status: true,
        },
      }),
    ]);

    const occupiedToday = today.reduce((a, b) => a + b.people, 0);
    const occupancy = r.capacity
      ? Math.min(100, Math.round((occupiedToday / r.capacity) * 100))
      : 0;

    return {
      restaurant: { id: r.id, name: r.name },
      occupancy,
      today,
      tomorrow,
    };
  }

  getProfile(restaurantId: number) {
    return this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        openingHours: true,
        imageGallery: true,
        capacity: true,
        latitude: true,
        longitude: true,
        location: true,
        cuisine: true,
        menu: true,
      },
    });
  }

  updateProfile(restaurantId: number, dto: any) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: dto,
    });
  }

  // Tables
  getTables(restaurantId: number) {
    return this.prisma.table.findMany({
      where: { restaurantId },
      orderBy: [{ isActive: 'desc' }, { seats: 'asc' }, { name: 'asc' }],
    });
  }

  createTable(
    restaurantId: number,
    dto: { name?: string; seats: number; isActive?: boolean },
  ) {
    return this.prisma.table.create({
      data: {
        restaurantId,
        name: dto.name ?? null,
        seats: dto.seats,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTable(restaurantId: number, tableId: number, dto: any) {
    const t = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { restaurantId: true },
    });
    if (!t || t.restaurantId !== restaurantId)
      throw new NotFoundException('Table not found');
    return this.prisma.table.update({ where: { id: tableId }, data: dto });
  }

  // Reservations
  listReservations(
    restaurantId: number,
    q: { date?: string; status?: $Enums.ReservationStatus },
  ) {
    const where: any = { restaurantId };
    if (q.status) where.status = q.status;
    if (q.date) {
      const d = dayjs(q.date);
      if (!d.isValid()) throw new BadRequestException('Invalid date');
      where.date = {
        gte: d.startOf('day').toDate(),
        lte: d.endOf('day').toDate(),
      };
    }
    return this.prisma.reservation.findMany({
      where,
      orderBy: { date: 'asc' },
      select: { id: true, date: true, time: true, people: true, status: true },
    });
  }

  async setReservationStatus(
    restaurantId: number,
    reservationId: number,
    status: $Enums.ReservationStatus,
  ) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { restaurantId: true },
    });
    if (!r || r.restaurantId !== restaurantId) {
      throw new NotFoundException('Reservation not found');
    }

    // jeśli status to CANCELLED/REJECTED → zwolnij wszystkie stoliki powiązane z rezerwacją
    const shouldFreeTables =
      status === $Enums.ReservationStatus.CANCELLED ||
      status === $Enums.ReservationStatus.REJECTED;

    return this.prisma.$transaction(async (tx) => {
      if (shouldFreeTables) {
        await tx.reservationTable.deleteMany({
          where: { reservationId },
        });
      }
      // na końcu ustaw status
      return tx.reservation.update({
        where: { id: reservationId },
        data: { status },
        select: { id: true, status: true },
      });
    });
  }

  async assignTable(
    restaurantId: number,
    reservationId: number,
    tableId: number,
  ) {
    const [rsv, tbl] = await Promise.all([
      this.prisma.reservation.findUnique({ where: { id: reservationId } }),
      this.prisma.table.findUnique({ where: { id: tableId } }),
    ]);
    if (!rsv || rsv.restaurantId !== restaurantId)
      throw new NotFoundException('Reservation not found');
    if (!tbl || tbl.restaurantId !== restaurantId)
      throw new NotFoundException('Table not found');
    if (!tbl.isActive) throw new BadRequestException('Table inactive');

    try {
      await this.prisma.reservationTable.create({
        data: { reservationId, tableId },
      });
    } catch {}
    return { ok: true };
  }

  async unassignTable(
    restaurantId: number,
    reservationId: number,
    tableId: number,
  ) {
    const rsv = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!rsv || rsv.restaurantId !== restaurantId)
      throw new NotFoundException('Reservation not found');

    await this.prisma.reservationTable.delete({
      where: { reservationId_tableId: { reservationId, tableId } },
    });
    return { ok: true };
  }

  async getMenu(restaurantId: number): Promise<MenuItem[]> {
    const r = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { menu: true },
    });
    return Array.isArray(r?.menu) ? (r.menu as MenuItem[]) : [];
  }

  async setMenu(restaurantId: number, items: MenuItem[]) {
    const cleaned = items.map(cleanItem);
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { menu: cleaned as Prisma.InputJsonValue },
      select: { id: true, menu: true },
    });
  }

  async addMenuItem(restaurantId: number, item: Partial<MenuItem>) {
    const current = await this.getMenu(restaurantId);
    current.push(cleanItem(item));
    return this.setMenu(restaurantId, current);
  }

  async updateMenuItem(
    restaurantId: number,
    index: number,
    patch: Partial<MenuItem>,
  ) {
    const current = await this.getMenu(restaurantId);
    if (index < 0 || index >= current.length)
      throw new BadRequestException('Invalid menu item index');

    const merged = { ...current[index], ...patch };
    current[index] = cleanItem(merged);
    return this.setMenu(restaurantId, current);
  }

  async removeMenuItem(restaurantId: number, index: number) {
    const current = await this.getMenu(restaurantId);
    if (index < 0 || index >= current.length)
      throw new BadRequestException('Invalid menu item index');

    current.splice(index, 1);
    return this.setMenu(restaurantId, current);
  }

  async moveMenuItem(restaurantId: number, from: number, to: number) {
    const arr = await this.getMenu(restaurantId);
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length)
      throw new BadRequestException('Invalid move indices');

    const [it] = arr.splice(from, 1);
    arr.splice(to, 0, it);
    return this.setMenu(restaurantId, arr);
  }
}
