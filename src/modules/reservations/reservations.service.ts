import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

type OpeningHours = {
  [day: string]: {
    open: string;
    close: string;
  };
};

// function calculateDistance(
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number,
// ): number {
//   const toRad = (value: number) => (value * Math.PI) / 180;
//   const R = 6371; // Promień Ziemi w km
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReservation(dto: CreateReservationDto, userId: number) {
    const { restaurantId, date, time, people } = dto;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant)
      throw new BadRequestException('Restauracja nie znaleziona');

    let openingHours: OpeningHours = {};
    if (restaurant.openingHours) {
      try {
        openingHours = JSON.parse(restaurant.openingHours) as OpeningHours;
      } catch {
        throw new BadRequestException(
          'Błędny format godzin otwarcia restauracji',
        );
      }
    }

    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayKey = days[new Date(date).getDay()];

    if (!openingHours[dayKey]) {
      throw new BadRequestException(`Restauracja jest zamknięta w ${dayKey}`);
    }

    const normalizeTime = (t: string) => {
      const [h, m = '00'] = t.split(':');
      const hh = String(Number(h)).padStart(2, '0');
      const mm = String(Number(m)).padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const tNorm = normalizeTime(time);
    const openNorm = normalizeTime(openingHours[dayKey].open);
    const closeNorm = normalizeTime(openingHours[dayKey].close);

    if (tNorm < openNorm || tNorm >= closeNorm) {
      throw new BadRequestException(
        `Restauracja przyjmuje rezerwacje od ${openNorm} do ${closeNorm}`,
      );
    }

    // 5) Złóż pełny DateTime
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      throw new BadRequestException('Nieprawidłowa data');
    }
    const [hour, minute] = tNorm.split(':').map(Number);
    dateObj.setHours(hour, minute, 0, 0);

    const existing = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        date: dateObj, // timestamp z godziną
        time: tNorm, // kolumna text
      },
      select: { people: true },
    });

    const totalPeople = existing.reduce((sum, r) => sum + r.people, 0);
    if (totalPeople + people > restaurant.capacity) {
      throw new BadRequestException('Brak dostępnych miejsc o tej godzinie');
    }

    try {
      return await this.prisma.reservation.create({
        data: {
          restaurantId,
          userId,
          date: dateObj,
          time: tNorm,
          people,
        },
      });
    } catch (e: any) {
      console.error(
        'Błąd zapisu rezerwacji:',
        e?.code ?? e,
        e?.meta ?? e?.message,
      );
      console.error('Błąd zapisu rezerwacji:', e);
      throw new BadRequestException('Nie udało się utworzyć rezerwacji');
    }
  }

  async getReservationsByUser(userId: number) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: { restaurant: true, review: true },
      orderBy: { date: 'desc' },
    });
  }
}
