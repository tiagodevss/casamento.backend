import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Run once per environment: ADMIN_SEED_EMAILS/ADMIN_SEED_PASSWORDS are only needed
// at seed time, never read by the running app afterwards.
const ADMINS = [
  { name: 'Tiago', email: process.env.ADMIN1_EMAIL, password: process.env.ADMIN1_PASSWORD },
  { name: 'Gabriela', email: process.env.ADMIN2_EMAIL, password: process.env.ADMIN2_PASSWORD },
];

const GIFTS_SEED = [
  // Cozinha
  { externalId: 'g-panela-ferro', title: 'Panela de ferro da felicidade', description: 'A primeira feijoada de casados começa aqui — uma panela que dura tanto quanto a promessa de vocês.', iconName: 'CookingPot', priceCents: 18000, tag: 'Mais escolhido' },
  { externalId: 'g-facas', title: 'Jogo de facas afiadas de verdade', description: 'Chega de serrar tomate com faca de manteiga. Um upgrade que o casal vai agradecer todo dia.', iconName: 'UtensilsCrossed', priceCents: 14000, tag: null },
  { externalId: 'g-liquidificador', title: 'Liquidificador do café da manhã', description: 'Vitaminas de domingo, sucos de segunda — o eletro que vira ritual de casa nova.', iconName: 'Sandwich', priceCents: 22000, tag: null },
  { externalId: 'g-panelas-antiaderentes', title: 'Jogo de panelas antiaderentes', description: 'O básico que todo casal recém-casado descobre que precisa já no primeiro mês.', iconName: 'UtensilsCrossed', priceCents: 28000, tag: null },
  { externalId: 'g-cafeteira', title: 'Cafeteira de manhãs preguiçosas', description: 'Café quentinho, manhã de domingo, silêncio gostoso — o comecinho de cada novo dia.', iconName: 'Coffee', priceCents: 16000, tag: null },
  { externalId: 'g-temperos', title: 'Kit organizador de temperos', description: 'Pra cozinha parecer de programa de culinária desde o primeiro tempero.', iconName: 'Soup', priceCents: 8500, tag: null },
  { externalId: 'g-tacas', title: 'Kit de taças pra brindar a vida', description: 'Porque toda conquista pequena do casal merece um brinde chique.', iconName: 'Wine', priceCents: 12000, tag: null },
  { externalId: 'g-jogo-jantar', title: 'Jogo de jantar completo', description: 'O jogo de pratos que vai receber a família inteira no primeiro Natal da casa nova.', iconName: 'UtensilsCrossed', priceCents: 32000, tag: 'Favorito' },
  { externalId: 'g-air-fryer', title: 'Fritadeira sem culpa', description: 'Batata frita todo dia sem pesar na consciência (nem na balança).', iconName: 'Flame', priceCents: 35000, tag: null },
  { externalId: 'g-panela-pressao', title: 'Panela de pressão da paciência zero', description: 'Feijão pronto em 20 minutos pra quem não aguenta esperar por nada — nem pelo casamento.', iconName: 'CookingPot', priceCents: 15000, tag: null },
  { externalId: 'g-processador', title: 'Processador de alimentos multitarefa', description: 'Pica, bate, mistura — o sócio silencioso de toda receita ambiciosa.', iconName: 'Sandwich', priceCents: 26000, tag: null },
  { externalId: 'g-jarra-suco', title: 'Jarra de suco gelado de domingo', description: 'Pro almoço de domingo em família ficar ainda mais gostoso.', iconName: 'Droplet', priceCents: 6000, tag: null },
  { externalId: 'g-forminha-gelo', title: 'Kit de forminhas de gelo', description: 'Porque verão em casa própria pede caipirinha bem gelada.', iconName: 'Droplet', priceCents: 4000, tag: null },
  { externalId: 'g-tabua-corte', title: 'Tábua de corte de madeira nobre', description: 'Pro chef da casa cortar tudo com estilo (mesmo que só saiba fritar ovo).', iconName: 'UtensilsCrossed', priceCents: 9000, tag: null },
  { externalId: 'g-potes-mantimento', title: 'Potes herméticos organizadores', description: 'Adeus pacote de macarrão aberto com pregador de roupa.', iconName: 'Soup', priceCents: 11000, tag: null },
  { externalId: 'g-panela-wok', title: 'Wok pra virar chef de comida oriental', description: 'Aquele yakisoba de sexta que só sai bom com a panela certa.', iconName: 'UtensilsCrossed', priceCents: 17000, tag: null },
  { externalId: 'g-mixer-mao', title: 'Mixer de mão pra sopa e vitamina', description: 'Menos louça pra lavar, mais sopa de inverno cremosa igual de restaurante.', iconName: 'Sandwich', priceCents: 9000, tag: null },

  // Quarto
  { externalId: 'g-edredom', title: 'Edredom de inverno abraçável', description: 'Para as noites frias em que o maior luxo é não sair de baixo das cobertas.', iconName: 'Bed', priceCents: 24000, tag: 'Favorito' },
  { externalId: 'g-jogo-cama', title: 'Jogo de cama de casal 400 fios', description: 'Pra virar de lado e sentir que a casa nova já é um hotel cinco estrelas.', iconName: 'Bed', priceCents: 20000, tag: null },
  { externalId: 'g-travesseiros', title: 'Travesseiros de nuvem', description: 'Pra brigar só na hora de escolher o lado da cama, nunca mais por causa do travesseiro.', iconName: 'Bed', priceCents: 15000, tag: null },
  { externalId: 'g-luminaria-leitura', title: 'Luminária de leitura do casal', description: 'Uma luz só pra quem gosta de ler até tarde sem acordar o outro.', iconName: 'Lamp', priceCents: 9500, tag: null },
  { externalId: 'g-cortina-blackout', title: 'Cortina blackout de dormir até tarde', description: 'Pro domingo de preguiça render até depois do meio-dia.', iconName: 'Home', priceCents: 18000, tag: null },
  { externalId: 'g-cabide', title: 'Kit de cabides organizados', description: 'Pra roupa parar de empilhar na cadeira "provisória" que nunca esvazia.', iconName: 'Shirt', priceCents: 7000, tag: null },
  { externalId: 'g-espelho-quarto', title: 'Espelho de corpo inteiro', description: 'Pra conferir o look antes de sair pra cada nova aventura a dois.', iconName: 'Home', priceCents: 16000, tag: null },
  { externalId: 'g-tapete-quarto', title: 'Tapete felpudo de pé descalço', description: 'O primeiro passo do dia merece ser macio.', iconName: 'Home', priceCents: 9000, tag: null },
  { externalId: 'g-organizador-guarda-roupa', title: 'Organizador de guarda-roupa a vácuo', description: 'Pra roupa de inverno sumir no armário sem tomar o espaço todo até o próximo frio.', iconName: 'Home', priceCents: 6000, tag: null },

  // Sala
  { externalId: 'g-sofa-cota', title: 'Sofá-cantinho de séries', description: 'Uma pequena cota pro sofá onde vão maratonar tudo juntos nos próximos 10 anos.', iconName: 'Sofa', priceCents: 35000, tag: 'Mais escolhido' },
  { externalId: 'g-aspirador-migalhas', title: 'Aspirador de migalhas do sofá', description: 'Pra briga eterna de "quem derrubou a pipoca" ter um fim tecnológico.', iconName: 'Sparkles', priceCents: 19000, tag: null },
  { externalId: 'g-tv-cota', title: 'Cota da nova TV de cinema em casa', description: 'Pra maratona de série ficar com cara (e som) de estreia de cinema.', iconName: 'Tv', priceCents: 45000, tag: null },
  { externalId: 'g-manta-sofa', title: 'Manta de sofá pra maratonar abraçados', description: 'Porque toda série boa pede uma manta e um abraço.', iconName: 'Sofa', priceCents: 8000, tag: null },
  { externalId: 'g-jogo-almofadas', title: 'Jogo de almofadas decorativas', description: 'O toque final que faz a sala parecer revista de decoração.', iconName: 'Sofa', priceCents: 9000, tag: null },
  { externalId: 'g-caixa-som', title: 'Caixa de som pra dança na sala', description: 'Pra cozinha virar pista de dança nas noites de faxina.', iconName: 'Music', priceCents: 22000, tag: null },
  { externalId: 'g-rack-tv', title: 'Rack organizador de TV', description: 'Onde os fios da casa nova finalmente vão parar de se esconder.', iconName: 'Home', priceCents: 28000, tag: null },
  { externalId: 'g-quadro-decorativo', title: 'Quadro decorativo pro casal', description: 'Uma parede que já nasce com a cara de vocês dois.', iconName: 'Home', priceCents: 12000, tag: null },

  // Banheiro
  { externalId: 'g-toalhas', title: 'Jogo de toalhas de banho fofinhas', description: 'O abraço que a casa nova dá todo dia depois do banho.', iconName: 'Droplet', priceCents: 13000, tag: null },
  { externalId: 'g-tapete-banheiro', title: 'Tapete de banheiro antiderrapante', description: 'Pra história de casados não começar com um tombo no banheiro.', iconName: 'Droplet', priceCents: 6000, tag: null },
  { externalId: 'g-kit-shampoo', title: 'Kit dispensers de banheiro organizado', description: 'Adeus embalagem de shampoo pela metade espalhada no box.', iconName: 'Droplet', priceCents: 7000, tag: null },
  { externalId: 'g-chuveiro', title: 'Chuveiro novo da casa própria', description: 'Banho quente e forte pra fechar bem qualquer dia daqui pra frente.', iconName: 'ShowerHead', priceCents: 25000, tag: null },
  { externalId: 'g-roupao', title: 'Roupão de casal', description: 'Pra sentir clima de spa todo santo dia da semana.', iconName: 'Droplet', priceCents: 15000, tag: null },
  { externalId: 'g-organizador-banheiro', title: 'Organizador de armário de banheiro', description: 'Cada creme, cada escova, seu devido lugar — enfim.', iconName: 'Home', priceCents: 9000, tag: null },

  // Área de serviço / ferramentas
  { externalId: 'g-varal-eletrico', title: 'Varal elétrico da área de serviço', description: 'Roupa seca em qualquer estação, sem depender do sol nem da sorte.', iconName: 'WashingMachine', priceCents: 30000, tag: null },
  { externalId: 'g-ferro-passar', title: 'Ferro de passar sem estresse', description: 'Camisa de trabalho sem ruga nenhuma — o herói invisível do dia a dia.', iconName: 'Sparkles', priceCents: 15000, tag: null },
  { externalId: 'g-tabua-passar', title: 'Tábua de passar roupa', description: 'O parceiro fiel do ferro, sempre esquecido até faltar.', iconName: 'Sparkles', priceCents: 9000, tag: null },
  { externalId: 'g-vassoura-magica', title: 'Vassoura e rodo "mágicos" de faxina rápida', description: 'Faxina de sábado em metade do tempo (a mágica é dividir a tarefa, não conta pra ninguém).', iconName: 'Sparkles', priceCents: 5000, tag: null },
  { externalId: 'g-lixeira-cozinha', title: 'Lixeira automática', description: 'Pra abrir a tampa sem tocar em nada — nem em discussão sobre quem esqueceu de trocar o saco.', iconName: 'Sparkles', priceCents: 12000, tag: null },
  { externalId: 'g-kit-limpeza', title: 'Kit de produtos de limpeza da casa nova', description: 'O primeiro estoque de casa própria, pronto pra qualquer bagunça.', iconName: 'Sparkles', priceCents: 6000, tag: null },
  { externalId: 'g-furadeira', title: 'Furadeira "porque sempre falta pendurar um quadro"', description: 'Pro quadro que está encostado na parede há semanas finalmente subir.', iconName: 'Drill', priceCents: 18000, tag: null },

  // Decoração / plantas
  { externalId: 'g-vaso-planta', title: 'Vaso de planta que promete não morrer', description: 'Uma plantinha (quase) indestrutível pra começar a decorar o cantinho verde da casa nova.', iconName: 'Flower2', priceCents: 7000, tag: null },
  { externalId: 'g-jogo-velas', title: 'Jogo de velas aromáticas', description: 'Pra casa nova já cheirar a lar desde o primeiro dia.', iconName: 'Flame', priceCents: 6000, tag: null },
  { externalId: 'g-porta-retrato', title: 'Porta-retratos pra história de vocês', description: 'Um lugar de honra pra guardar os melhores momentos que ainda vão viver.', iconName: 'Home', priceCents: 5000, tag: null },
  { externalId: 'g-tapete-sala', title: 'Tapete que amarra a sala', description: 'Aquele detalhe que faz tudo parecer que sempre esteve no lugar certo.', iconName: 'Home', priceCents: 14000, tag: null },
  { externalId: 'g-relogio-parede', title: 'Relógio de parede do tempo a dois', description: 'Pra marcar cada hora boa dessa nova fase.', iconName: 'Home', priceCents: 8000, tag: null },
  { externalId: 'g-difusor-aromas', title: 'Difusor de aromas da casa nova', description: 'Um cheirinho gostoso pairando no ar todos os dias.', iconName: 'Flame', priceCents: 9000, tag: null },
  { externalId: 'g-luzinha-pisca', title: 'Cordão de luzinha pra sala com cara de Pinterest', description: 'Aquele efeito "morei fora" que na real é só 20 minutos pendurando fiozinho.', iconName: 'Sparkles', priceCents: 5000, tag: null },
  { externalId: 'g-kit-vinho', title: 'Kit taças e acessórios pra noite de vinho em casa', description: 'Pra sentir clima de vinícola chique sem sair do sofá.', iconName: 'Wine', priceCents: 11000, tag: null },

  // Experiências / lua de mel
  { externalId: 'g-lua', title: 'Lanternas na lua de mel', description: 'Ajude os noivos a soltarem lanternas sob o céu da nossa primeira viagem a dois.', iconName: 'Flame', priceCents: 15000, tag: 'Mágico' },
  { externalId: 'g-jantar', title: 'Jantar de conto de fadas', description: 'Um jantar romântico digno de um final feliz, à luz de velas.', iconName: 'UtensilsCrossed', priceCents: 25000, tag: null },
  { externalId: 'g-aventura', title: 'Cota da primeira aventura', description: 'Um passeio inesquecível para começar a escrever novas histórias juntos.', iconName: 'Compass', priceCents: 20000, tag: null },
  { externalId: 'g-cafe', title: 'Café da manhã real', description: 'Manhãs preguiçosas e doces para o início de cada novo capítulo.', iconName: 'Coffee', priceCents: 9000, tag: null },
  { externalId: 'g-upgrade', title: 'Upgrade mágico da lua de mel', description: 'Um toque extra de encanto para tornar a viagem ainda mais especial.', iconName: 'Sparkles', priceCents: 40000, tag: 'Real' },
  { externalId: 'g-castelo', title: 'Tijolinhos do novo castelo', description: 'Uma contribuição para o nosso novo lar — o castelo onde viveremos felizes.', iconName: 'Castle', priceCents: 12000, tag: null },
  { externalId: 'g-passeio-barco', title: 'Passeio de barco ao pôr do sol', description: 'Aquela foto de casal com o sol se pondo atrás — o cartão postal da viagem.', iconName: 'Compass', priceCents: 18000, tag: null },
  { externalId: 'g-piquenique-praia', title: 'Piquenique na praia da lua de mel', description: 'Areia, mar e um vinho gelado — o dia mais "resenha" da viagem toda.', iconName: 'Coffee', priceCents: 11000, tag: null },

  // Diversão / toque cômico
  { externalId: 'g-moletom-duplo', title: 'Moletom duplo de domingo preguiçoso', description: 'Um par igual pra assistir filme grudadinhos no sofá, sem vergonha nenhuma.', iconName: 'Sofa', priceCents: 13000, tag: null },
  { externalId: 'g-jogo-tabuleiro', title: 'Jogo de tabuleiro pra noite sem tela', description: 'Pra descobrir logo cedo quem é mau perdedor no casamento.', iconName: 'Dice5', priceCents: 8000, tag: null },
  { externalId: 'g-kit-pipoca', title: 'Kit pipoqueira de cinema em casa', description: 'Sessão de cinema em casa, com direito a manteiga derretida escorrendo pelo braço.', iconName: 'Popcorn', priceCents: 9000, tag: null },
  { externalId: 'g-anti-briga-loucas', title: 'Kit anti-briga de quem lava a louça', description: 'Duas esponjas, duas luvas — ninguém mais discute de quem é a vez.', iconName: 'Sparkles', priceCents: 6000, tag: null },
  { externalId: 'g-kit-sobrevivencia', title: 'Kit sobrevivência do primeiro ano de casados', description: 'Café forte, chocolate e paciência — tudo que todo casal recém-casado precisa por perto.', iconName: 'Candy', priceCents: 8000, tag: null },
  { externalId: 'g-cofrinho', title: 'Cofrinho da poupança da casa nova', description: 'Pra guardar moedinha pro primeiro sonho grande dos dois.', iconName: 'PiggyBank', priceCents: 5000, tag: null },
  { externalId: 'g-camiseta-casal', title: 'Camiseta engraçada "Time da Bagunça"', description: 'Pra usar em casa nos dias em que a arrumação perde feio.', iconName: 'Shirt', priceCents: 7000, tag: null },
  { externalId: 'g-caneca-casal', title: 'Par de canecas combinando', description: 'Café da manhã com a cara dos dois, todo santo dia.', iconName: 'Coffee', priceCents: 4000, tag: null },
  { externalId: 'g-jogo-cartas', title: 'Baralho e jogos de carta pra noite de sofá', description: 'Pra quando o Wi-Fi cair e o amor precisar se virar sem tela.', iconName: 'Dice5', priceCents: 5000, tag: null },
  { externalId: 'g-fone-bluetooth', title: 'Fone sem fio de ouvir podcast fingindo que trabalha', description: 'Ou pra fugir do barulho da obra do vizinho, o que vier primeiro.', iconName: 'Music', priceCents: 15000, tag: null },
  { externalId: 'g-streaming', title: 'Assinatura de streaming pra maratona sem fim', description: '"Só mais um episódio" e de repente já é 2h da manhã.', iconName: 'Tv', priceCents: 6000, tag: null },
  { externalId: 'g-fundo-emergencia', title: 'Fundo de emergência que sempre estoura no fim do mês', description: 'Pra quando a geladeira decide pifar bem na semana que "tava tudo controlado".', iconName: 'PiggyBank', priceCents: 5000, tag: null },
  { externalId: 'g-churrasco-fds', title: 'Kit churrasco de fim de semana', description: 'Carvão, espeto e aquela desculpa perfeita pra chamar todo mundo lá em casa.', iconName: 'Flame', priceCents: 20000, tag: null },

  // Eletros grandes (cota)
  { externalId: 'g-microondas', title: 'Micro-ondas dos aquece-rápido', description: 'Pra esquentar o prato do dia anterior sem perder a paciência (nem o prato).', iconName: 'Microwave', priceCents: 32000, tag: null },
  { externalId: 'g-geladeira-cota', title: 'Cota da geladeira nova', description: 'O coração da cozinha da casa nova — cada cota ajuda a completar esse sonho grande.', iconName: 'Refrigerator', priceCents: 60000, tag: 'Grande sonho' },
  { externalId: 'g-maquina-lavar', title: 'Cota da máquina de lavar', description: 'Pra roupa suja parar de virar discussão de sábado de manhã.', iconName: 'WashingMachine', priceCents: 55000, tag: 'Grande sonho' },
  { externalId: 'g-aspirador-robo', title: 'Robô aspirador preguiçoso oficial', description: 'Ele limpa, vocês só precisam tirar uma foto dele passando por baixo do sofá.', iconName: 'Sparkles', priceCents: 45000, tag: null },
  { externalId: 'g-ar-condicionado', title: 'Cota do ar-condicionado das noites de verão', description: 'Pra dormir bem mesmo nas noites mais quentes do ano.', iconName: 'Snowflake', priceCents: 50000, tag: 'Grande sonho' },
];

// Optional local staging folder: prisma/seed-images/<externalId>.(jpg|jpeg|png|webp).
// If a file is found for a gift, it is copied into the uploads dir and imagePath is
// set — lets us ship real photos without depending on a public image-URL field.
const SEED_IMAGES_DIR = path.resolve(__dirname, 'seed-images');
const EXT_BY_SUFFIX: Record<string, string> = { '.jpg': 'jpg', '.jpeg': 'jpg', '.png': 'png', '.webp': 'webp' };

function uploadsBaseDir(): string {
  const configured = process.env.UPLOADS_DIR;
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), 'uploads');
}

async function findSeedImage(externalId: string): Promise<{ absPath: string; ext: string } | null> {
  for (const suffix of Object.keys(EXT_BY_SUFFIX)) {
    const candidate = path.join(SEED_IMAGES_DIR, `${externalId}${suffix}`);
    try {
      await fs.access(candidate);
      return { absPath: candidate, ext: EXT_BY_SUFFIX[suffix] };
    } catch {
      // try next extension
    }
  }
  return null;
}

async function attachSeedImage(giftId: string, externalId: string): Promise<void> {
  const found = await findSeedImage(externalId);
  if (!found) return;

  const giftsDir = path.join(uploadsBaseDir(), 'gifts');
  await fs.mkdir(giftsDir, { recursive: true });
  const relative = `gifts/${giftId}.${found.ext}`;
  await fs.copyFile(found.absPath, path.join(uploadsBaseDir(), relative));
  await prisma.gift.update({ where: { id: giftId }, data: { imagePath: relative } });
}

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

  let giftsWithPhoto = 0;
  for (const gift of GIFTS_SEED) {
    const saved = await prisma.gift.upsert({
      where: { externalId: gift.externalId },
      update: gift,
      create: gift,
    });
    const hadImage = Boolean(saved.imagePath);
    await attachSeedImage(saved.id, gift.externalId);
    if (!hadImage) {
      const refreshed = await prisma.gift.findUnique({ where: { id: saved.id } });
      if (refreshed?.imagePath) giftsWithPhoto += 1;
    } else {
      giftsWithPhoto += 1;
    }
  }
  console.log(`Gifts seeded: ${GIFTS_SEED.length} (${giftsWithPhoto} com foto)`);

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
