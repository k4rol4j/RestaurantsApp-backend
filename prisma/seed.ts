/* prisma/seed.ts */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Zaokrągla w dół do wielokrotności m (np. 17 -> 16 dla m=2)
 */
function floorToMultiple(n: number, m: number) {
  return Math.floor(n / m) * m;
}

/**
 * Zaplanuj stoliki dla zadanej pojemności (capacity) w proporcji:
 * 50% miejsc → stoły 2-os., 30% → 4-os., 20% → 6-os.
 * Jeśli capacity jest nieparzyste → dodaj 1-os. stolik.
 * Zwraca listę rozmiarów stolików (np. [6,6,4,2,2,1])
 */
function planTables(capacity: number): number[] {
  if (capacity <= 0) return [];

  const tables: number[] = [];

  // Jeżeli nieparzyste, dodaj 1-os., a resztę licz na parzystej części
  let oddSeat = 0;
  if (capacity % 2 === 1) {
    oddSeat = 1;
    capacity -= 1;
  }

  // Docelowy podział miejsc wg proporcji (po parzystej części)
  const seats2 = floorToMultiple(capacity * 0.5, 2); // wielokrotność 2
  const seats4 = floorToMultiple(capacity * 0.3, 4); // wielokrotność 4
  const seats6 = floorToMultiple(capacity * 0.2, 6); // wielokrotność 6

  const used = seats2 + seats4 + seats6;
  let remaining = capacity - used;

  // liczby stolików z powyższych "miejsc"
  let count2 = seats2 / 2;
  let count4 = seats4 / 4;
  let count6 = seats6 / 6;

  // Dopełnij resztę greedy: 6 -> 4 -> 2
  while (remaining > 0) {
    if (remaining >= 6) {
      count6 += 1;
      remaining -= 6;
    } else if (remaining >= 4) {
      count4 += 1;
      remaining -= 4;
    } else if (remaining >= 2) {
      count2 += 1;
      remaining -= 2;
    } else {
      // tu nie powinniśmy wejść, bo remaining jest parzyste
      break;
    }
  }

  // Zbuduj listę stolików
  for (let i = 0; i < count6; i++) tables.push(6);
  for (let i = 0; i < count4; i++) tables.push(4);
  for (let i = 0; i < count2; i++) tables.push(2);
  if (oddSeat) tables.push(1);

  // Gwarancja: przynajmniej 1 stolik
  if (tables.length === 0) tables.push(2);

  return tables;
}

/**
 * Włącza kasowanie istniejących stolików przed seedem.
 * Ustaw na true, jeśli chcesz nadpisać.
 */
const CLEAR_EXISTING_TABLES = false;

async function seedTablesForAllRestaurants() {
  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, name: true, capacity: true },
  });

  for (const r of restaurants) {
    const capacity = Number(r.capacity ?? 0);

    // Pomiń restauracje bez sensownej pojemności
    if (!capacity || capacity <= 0) {
      console.log(
        `⚠️  Pomijam "${r.name}" (id=${r.id}) — brak prawidłowej capacity.`,
      );
      continue;
    }

    const existingCount = await prisma.table.count({
      where: { restaurantId: r.id },
    });

    if (existingCount > 0) {
      if (!CLEAR_EXISTING_TABLES) {
        console.log(
          `ℹ️  "${r.name}" (id=${r.id}): już ma ${existingCount} stolików — pomijam.`,
        );
        continue;
      } else {
        // wyczyść powiązania i stoliki (uwaga: usunie ReservationTable dla tych stolików)
        await prisma.reservationTable.deleteMany({
          where: { table: { restaurantId: r.id } },
        });
        await prisma.table.deleteMany({ where: { restaurantId: r.id } });
        console.log(
          `🧹  "${r.name}" (id=${r.id}): wyczyszczono istniejące stoliki.`,
        );
      }
    }

    const plan = planTables(capacity);

    // Poskładaj rekordy do createMany
    const data = plan.map((seats, idx) => {
      const prefix = `T${seats}`;
      return {
        restaurantId: r.id,
        seats,
        name: `${prefix}-${idx + 1}`,
        isActive: true,
      };
    });

    if (data.length === 0) {
      console.log(`⚠️  "${r.name}" (id=${r.id}): plan pusty — pomijam.`);
      continue;
    }

    await prisma.table.createMany({ data, skipDuplicates: true });
    const totalSeats = plan.reduce((s, v) => s + v, 0);

    console.log(
      `✅ "${r.name}" (id=${r.id}): utworzono ${data.length} stolików, ` +
        `miejsc razem = ${totalSeats} (capacity=${capacity})`,
    );
  }
}

async function main() {
  await seedTablesForAllRestaurants();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
