import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function normalizeCuisine(name: string): string {
  const n = name.toLowerCase();

  if (n.includes('włos')) return 'Kuchnia włoska';
  if (n.includes('polsk')) return 'Kuchnia polska';
  if (n.includes('pizza')) return 'Pizza';

  if (
    n.includes('azjat') ||
    n.includes('japo') ||
    n.includes('sushi') ||
    n.includes('indy')
  ) {
    return 'Kuchnia azjatycka';
  }

  if (n.includes('ameryk') || n.includes('burger') || n.includes('fast')) {
    return 'Fast food';
  }

  // cała reszta europejskich
  if (
    n.includes('franc') ||
    n.includes('hiszp') ||
    n.includes('ukrai') ||
    n.includes('gruzi') ||
    n.includes('europ')
  ) {
    return 'Kuchnia europejska';
  }

  return 'Kuchnia europejska';
}

async function main() {
  console.log('Updating cuisines...');

  // Wczytujemy stare dane restauracji
  const filePath = path.join(__dirname, 'data', 'Restaurant.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const restaurantsJson = JSON.parse(raw);

  console.log('Loaded restaurants:', restaurantsJson.length);

  // Najpierw czyścimy stare powiązania i kategorie
  await prisma.restaurantCuisine.deleteMany({});
  await prisma.cuisine.deleteMany({});

  console.log('Old cuisines removed.');

  // Lista finalnych kategorii
  const finalCategories = [
    'Kuchnia europejska',
    'Kuchnia polska',
    'Kuchnia włoska',
    'Kuchnia azjatycka',
    'Fast food',
    'Pizza',
  ];

  // Wstawiamy nowe kategorie
  const cuisineRecords = await Promise.all(
    finalCategories.map((name) => prisma.cuisine.create({ data: { name } })),
  );

  const cuisineMap = new Map<string, number>();
  cuisineRecords.forEach((c) => cuisineMap.set(c.name, c.id));

  console.log('Inserted new cuisines:', finalCategories);

  // Teraz przechodzimy po restauracjach i przypinamy kategorię
  for (const r of restaurantsJson) {
    const normalized = normalizeCuisine(r.cuisine);

    const cuisineId = cuisineMap.get(normalized);
    if (!cuisineId) continue;

    // znajdujemy restaurację po nazwie (TAK JAK MASZ W BAZIE)
    const restaurant = await prisma.restaurant.findFirst({
      where: { name: r.name },
    });

    if (!restaurant) {
      console.log('Restaurant not found:', r.name);
      continue;
    }

    // dodajemy powiązanie
    await prisma.restaurantCuisine.create({
      data: {
        restaurantId: restaurant.id,
        cuisineId: cuisineId,
      },
    });

    console.log(`Assigned ${normalized} → ${r.name}`);
  }

  console.log('Cuisine update completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
