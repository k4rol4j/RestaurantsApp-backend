import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

type OpeningHours = {
  [day: string]: {
    open: string;
    close: string;
  };
};

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Promień Ziemi w km
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

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReservation(dto: CreateReservationDto, userId: number) {
    const { restaurantId, date, time, people } = dto;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new BadRequestException('Restauracja nie znaleziona');
    }

    // 📅 Sprawdź godziny otwarcia
    const openingHours = restaurant.openingHours
      ? (JSON.parse(restaurant.openingHours) as OpeningHours)
      : {};

    const day = new Date(date)
      .toLocaleDateString('en-US', {
        weekday: 'long',
      })
      .toLowerCase();

    if (!openingHours[day]) {
      throw new BadRequestException(`Restauracja jest zamknięta w ${day}`);
    }

    const { open, close } = openingHours[day];
    if (time < open || time > close) {
      throw new BadRequestException(
        `Restauracja przyjmuje rezerwacje od ${open} do ${close}`,
      );
    }

    // Utwórz pełny obiekt daty i godziny
    const [hour, minute] = time.split(':');
    const dateObj = new Date(date);
    dateObj.setHours(Number(hour));
    dateObj.setMinutes(Number(minute));
    dateObj.setSeconds(0);
    dateObj.setMilliseconds(0);

    // Sprawdź dostępność miejsc
    const existingReservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        date: dateObj,
      },
    });

    const totalPeople = existingReservations.reduce(
      (sum, r) => sum + r.people,
      0,
    );
    if (totalPeople + people > restaurant.capacity) {
      throw new BadRequestException('Brak dostępnych miejsc o tej godzinie');
    }

    // ✅ Utwórz rezerwację
    try {
      return await this.prisma.reservation.create({
        data: {
          restaurantId,
          userId,
          date: dateObj,
          time,
          people,
        },
      });
    } catch (error) {
      console.error('Błąd zapisu rezerwacji:', error);
      throw error;
    }
  }

  async getReservationsByUser(userId: number) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: {
        restaurant: true,
        review: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }
}
