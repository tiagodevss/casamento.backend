import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Run once per environment: ADMIN_SEED_EMAILS/ADMIN_SEED_PASSWORDS are only needed
// at seed time, never read by the running app afterwards.
const ADMINS = [
  { name: 'Tiago', email: process.env.ADMIN1_EMAIL, password: process.env.ADMIN1_PASSWORD },
  { name: 'Gabriela', email: process.env.ADMIN2_EMAIL, password: process.env.ADMIN2_PASSWORD },
];

const GIFTS_SEED = [
  { externalId: 'g-lua', title: 'Lanternas na lua de mel', description: 'Ajude os noivos a soltarem lanternas sob o céu da nossa primeira viagem a dois.', iconName: 'Flame', priceCents: 15000, tag: 'Mágico' },
  { externalId: 'g-jantar', title: 'Jantar de conto de fadas', description: 'Um jantar romântico digno de um final feliz, à luz de velas.', iconName: 'UtensilsCrossed', priceCents: 25000, tag: null },
  { externalId: 'g-aventura', title: 'Cota da primeira aventura', description: 'Um passeio inesquecível para começar a escrever novas histórias juntos.', iconName: 'Compass', priceCents: 20000, tag: null },
  { externalId: 'g-cafe', title: 'Café da manhã real', description: 'Manhãs preguiçosas e doces para o início de cada novo capítulo.', iconName: 'Coffee', priceCents: 9000, tag: null },
  { externalId: 'g-upgrade', title: 'Upgrade mágico da lua de mel', description: 'Um toque extra de encanto para tornar a viagem ainda mais especial.', iconName: 'Sparkles', priceCents: 40000, tag: 'Real' },
  { externalId: 'g-castelo', title: 'Tijolinhos do novo castelo', description: 'Uma contribuição para o nosso novo lar — o castelo onde viveremos felizes.', iconName: 'Castle', priceCents: 12000, tag: null },
];

// Seeded in reverse order with descending timestamps so, sorted newest-first
// (how the guestbook wall displays), they read in the same order as before.
const MESSAGES_SEED = [
  { name: 'Tia Marta', text: 'Que a luz de vocês ilumine cada dia dessa nova jornada. Amo vocês!' },
  { name: 'Rafael & Bia', text: 'Vocês nasceram um para o outro. Mal podemos esperar pelo grande dia!' },
  { name: 'Vovó Cida', text: 'Minha bênção e meu amor acompanham vocês para sempre.' },
  { name: 'Os amigos de sempre', text: 'Soltamos nossa lanterna por vocês. Felicidades infinitas!' },
];

async function main() {
  for (const admin of ADMINS) {
    if (!admin.email || !admin.password) {
      console.warn(`Pulando seed de ${admin.name}: ADMIN*_EMAIL/ADMIN*_PASSWORD não definidos no .env`);
      continue;
    }
    const passwordHash = await bcrypt.hash(admin.password, 12);
    await prisma.admin.upsert({
      where: { email: admin.email },
      update: { name: admin.name, passwordHash },
      create: { name: admin.name, email: admin.email, passwordHash },
    });
    console.log(`Admin seeded: ${admin.name} <${admin.email}>`);
  }

  for (const gift of GIFTS_SEED) {
    await prisma.gift.upsert({
      where: { externalId: gift.externalId },
      update: gift,
      create: gift,
    });
  }
  console.log(`Gifts seeded: ${GIFTS_SEED.length}`);

  const existingMessageCount = await prisma.guestMessage.count();
  if (existingMessageCount === 0) {
    const base = Date.now();
    await prisma.guestMessage.createMany({
      data: MESSAGES_SEED.map((message, index) => ({
        ...message,
        // Spaced a minute apart, list-order preserved when sorted newest-first;
        // all safely in the past so real guest posts (created at "now") sort above.
        createdAt: new Date(base - (index + 1) * 60_000),
      })),
    });
    console.log(`Guest messages seeded: ${MESSAGES_SEED.length}`);
  } else {
    console.log('Guest messages already present, skipping seed');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
