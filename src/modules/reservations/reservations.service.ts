import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationStatus } from '@prisma/client';

type OpeningHours = {
  [day: string]: {
    open: string;
    close: string;
  };
};

type TableLike = { id: number; seats: number };
type Candidate = { ids: number[]; over: number };

function pickUpTo3Tables(free: TableLike[], people: number): number[] | null {
  if (!free.length) return null;

  const tables = [...free].sort((a, b) => a.seats - b.seats);

  let best: Candidate | null = null;

  const seatsById = new Map(tables.map((t) => [t.id, t.seats]));
  const consider = (ids: number[]) => {
    const total = ids.reduce((s, id) => s + (seatsById.get(id) ?? 0), 0);
    if (total >= people) {
      const over = total - people;
      if (
        !best ||
        over < best.over ||
        (over === best.over && ids.length < best.ids.length)
      ) {
        best = { ids, over };
      }
    }
  };

  // 1 stolik
  for (let i = 0; i < tables.length; i++) consider([tables[i].id]);
  if (best) return (best as Candidate).ids;

  // 2 stoliki
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      consider([tables[i].id, tables[j].id]);
    }
  }
  if (best) return (best as Candidate).ids;

  // 3 stoliki
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      for (let k = j + 1; k < tables.length; k++) {
        consider([tables[i].id, tables[j].id, tables[k].id]);
      }
    }
  }

  return best ? (best as Candidate).ids : null;
}

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
    if (!dayHours)
      throw new BadRequestException(`Restauracja jest zamknięta w ${dayKey}`);

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

    // Start w [open, close)
    if (tNorm < openNorm || tNorm >= closeNorm) {
      throw new BadRequestException(
        `Restauracja przyjmuje rezerwacje od ${openNorm} do ${closeNorm}`,
      );
    }

    // 3) Początek/koniec rezerwacji
    const startAt = new Date(date);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Nieprawidłowa data');
    }
    const [hour, minute] = tNorm.split(':').map(Number);
    startAt.setHours(hour, minute, 0, 0);

    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    // Rezerwacja musi zakończyć się przed zamknięciem
    const [closeH, closeM] = closeNorm.split(':').map(Number);
    const closingAt = new Date(startAt);
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

    // [MANUALNY WYBÓR STOLIKA]
    if (dto.tableId) {
      // 1) policz stoliki zajęte w tym oknie czasu
      const overlapping = await this.prisma.reservationTable.findMany({
        where: {
          reservation: {
            restaurantId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            AND: [{ date: { lt: endAt } }, { endAt: { gt: startAt } }], // overlap
          },
        },
        select: { tableId: true },
      });
      const busyIds = new Set(overlapping.map((r) => r.tableId));

      // 2) sprawdź, czy dany stolik pasuje (restauracja, aktywny, seats==people) i NIE jest zajęty
      const tableOk = await this.prisma.table.findFirst({
        where: {
          restaurantId,
          isActive: true,
          seats: people,
          AND: [
            { id: dto.tableId },
            busyIds.size ? { id: { notIn: Array.from(busyIds) } } : {},
          ],
        },
        select: { id: true },
      });

      if (!tableOk) throw new BadRequestException('Table not available');

      // 3) zapis rezerwacji + przypięcie stolika
      return this.prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.create({
          data: {
            restaurantId,
            userId,
            date: startAt, // u Ciebie "date" = start
            time: tNorm,
            people,
            durationMinutes,
            endAt,
          },
        });

        await tx.reservationTable.create({
          data: { reservationId: reservation.id, tableId: dto.tableId! },
        });

        return reservation;
      });
    }

    // 4) Wolne stoliki (brak nakładających się rezerwacji)
    const freeTables = await this.prisma.table.findMany({
      where: {
        restaurantId,
        isActive: true,
        reservations: {
          none: {
            reservation: {
              restaurantId,
              NOT: [
                { endAt: { lte: startAt } }, // kończy się PRZED moją
                { date: { gte: endAt } }, // zaczyna się PO mojej
              ],
            },
          },
        },
      },
      select: { id: true, seats: true },
    });

    // 5) Wybór do 3 stolików (minimalna nadwyżka miejsc)
    const pickedIds = pickUpTo3Tables(freeTables, people);
    if (!pickedIds) {
      throw new BadRequestException(
        'Brak pasujących stolików w tym czasie (limit 3 stoliki).',
      );
    }

    // 6) Zapis w transakcji (re-check, żeby nie ścignął nas wyścig)
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // re-check: czy któreś z wybranych stolików nie dostały rezerwacji w międzyczasie
        const conflicts = await tx.reservationTable.findMany({
          where: {
            tableId: { in: pickedIds },
            reservation: {
              restaurantId,
              NOT: [{ endAt: { lte: startAt } }, { date: { gte: endAt } }],
            },
          },
          select: { tableId: true },
        });

        if (conflicts.length > 0) {
          throw new BadRequestException(
            'Wybrany stolik/stoliki zostały właśnie zajęte. Spróbuj inną godzinę.',
          );
        }

        // tworzenie rezerwacji + powiązań stolików
        return await tx.reservation.create({
          data: {
            restaurantId,
            userId,
            date: startAt, // start
            time: tNorm, // dla UI
            people,
            durationMinutes,
            endAt,
            tables: {
              create: pickedIds.map((tableId) => ({ tableId })),
            },
          },
          include: {
            tables: { include: { table: true } },
            restaurant: true,
          },
        });
      });

      return result;
    } catch (e: any) {
      // jeżeli trafi tu mój BadRequest — poleci dalej; inne błędy mapuję
      if (e instanceof BadRequestException) throw e;
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
      where: {
        userId,
        status: { not: ReservationStatus.CANCELLED }, // <— klucz
        // jeśli chcesz schować też REJECTED:
        // status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.REJECTED] }
      },
      include: {
        restaurant: true,
        review: true,
        tables: { include: { table: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async cancelReservation(reservationId: number, userId: number) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, status: true, date: true },
    });

    if (!r) throw new ForbiddenException('Rezerwacja nie istnieje.');
    if (r.userId !== userId)
      throw new ForbiddenException('Nie możesz anulować cudzej rezerwacji.');
    if (r.date < new Date())
      throw new ForbiddenException('Nie można anulować przeszłej rezerwacji.');
    if (r.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Można anulować tylko rezerwacje oczekujące (PENDING).',
      );
    }

    // zwolnij stoliki przypięte do tej rezerwacji
    await this.prisma.reservationTable.deleteMany({ where: { reservationId } });

    // soft-cancel
    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CANCELLED },
      select: { id: true, status: true },
    });
  }
}
