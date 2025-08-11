import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

type OpeningHours = {
  [day: string]: {
    open: string; // "HH:mm"
    close: string; // "HH:mm"
  };
};

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReservation(dto: CreateReservationDto, userId: number) {
    const { restaurantId, date, time, people, durationMinutes = 90 } = dto;

    // 1) Restauracja
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant)
      throw new BadRequestException('Restauracja nie znaleziona');

    // 2) Godziny otwarcia
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
    const dayHours = openingHours[dayKey];
    if (!dayHours) {
      throw new BadRequestException(`Restauracja jest zamknięta w ${dayKey}`);
    }

    const normalizeTime = (t: string) => {
      const [h, m = '00'] = (t ?? '').split(':');
      const hh = String(Number(h)).padStart(2, '0');
      const mm = String(Number(m)).padStart(2, '0');
      if (Number.isNaN(Number(h)) || Number.isNaN(Number(m))) {
        throw new BadRequestException(
          'Nieprawidłowy format godziny (oczekiwane HH:mm)',
        );
      }
      return `${hh}:${mm}`;
    };

    const tNorm = normalizeTime(time);
    const openNorm = normalizeTime(dayHours.open);
    const closeNorm = normalizeTime(dayHours.close);

    // Start musi mieścić się w [open, close)
    if (tNorm < openNorm || tNorm >= closeNorm) {
      throw new BadRequestException(
        `Restauracja przyjmuje rezerwacje od ${openNorm} do ${closeNorm}`,
      );
    }

    // 3) Początek i koniec rezerwacji
    const startAt = new Date(date);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Nieprawidłowa data');
    }
    const [hour, minute] = tNorm.split(':').map(Number);
    startAt.setHours(hour, minute, 0, 0);

    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    // 3a) Nie wykraczaj poza godzinę zamknięcia
    const [closeH, closeM] = closeNorm.split(':').map(Number);
    const closingAt = new Date(startAt); // ten sam dzień co start
    closingAt.setHours(closeH, closeM, 0, 0);

    if (endAt > closingAt) {
      const lastStart = new Date(
        closingAt.getTime() - durationMinutes * 60 * 1000,
      );
      const pad = (n: number) => String(n).padStart(2, '0');
      const lastStartStr = `${pad(lastStart.getHours())}:${pad(lastStart.getMinutes())}`;
      throw new BadRequestException(
        `Rezerwacja o długości ${durationMinutes} min musi zakończyć się do ${closeNorm}. ` +
          `Najpóźniejsza godzina rozpoczęcia to ${lastStartStr}.`,
      );
    }

    // 4) Kolizje czasowe (nachodzące się przedziały)
    const overlapping = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        NOT: [
          { endAt: { lte: startAt } }, // istniejąca kończy się PRZED moją
          { date: { gte: endAt } }, // istniejąca zaczyna się PO mojej
        ],
      },
      select: { people: true },
    });

    const totalPeople = overlapping.reduce((sum, r) => sum + r.people, 0);
    const capacity = Number(restaurant.capacity ?? 0);
    if (capacity <= 0) {
      throw new BadRequestException('Restauracja ma niepoprawną pojemność');
    }
    if (totalPeople + people > capacity) {
      throw new BadRequestException('Brak dostępnych miejsc w tym czasie');
    }

    // 5) Zapis
    try {
      return await this.prisma.reservation.create({
        data: {
          restaurantId,
          userId,
          date: startAt, // start (zostawiasz dla kompatybilności)
          time: tNorm, // pole tekstowe dla UI
          people,
          durationMinutes,
          endAt,
        },
      });
    } catch (e: any) {
      console.error(
        'Błąd zapisu rezerwacji:',
        e?.code ?? e,
        e?.meta ?? e?.message,
      );
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
