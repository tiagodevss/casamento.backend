"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
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
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map