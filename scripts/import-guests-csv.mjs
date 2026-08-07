import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, GuestSide } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../../Convidados Casamento - Convidados.csv');

function parseLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === ',' && !q) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || '').trim();
    });
    return obj;
  });
}

function mapSide(lado) {
  if (lado === 'Noivo') return GuestSide.GROOM;
  if (lado === 'Noiva') return GuestSide.BRIDE;
  if (lado === 'Casal') return GuestSide.BOTH;
  throw new Error(`Lado inválido: ${lado}`);
}

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits || null;
}

function familyKey(row) {
  const fam = row['Nome da Família'];
  if (!fam || fam === '-') return null;
  return fam;
}

function normalizeName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function buildSearchNames(displayName, members) {
  const names = [displayName, ...members.map((m) => m.name)].map(normalizeName);
  return [...new Set(names.filter(Boolean))];
}

function buildGroups(rows) {
  /** @type {Map<string, { displayName: string, side: GuestSide, invitedToParty: boolean, phone: string|null, members: { name: string, isChild: boolean }[] }>} */
  const familyGroups = new Map();
  const individuals = [];

  for (const row of rows) {
    const name = row.Nome?.trim();
    if (!name) continue;

    const isChild = row['Criança'] === 'Sim';
    const invitedToParty = row['Festa também'] === 'Sim';
    const side = mapSide(row.Lado);
    const phone = normalizePhone(row.Contato);
    const fam = familyKey(row);

    if (!fam) {
      individuals.push({
        displayName: name,
        side,
        invitedToParty,
        phone,
        members: [{ name, isChild }],
      });
      continue;
    }

    if (!familyGroups.has(fam)) {
      familyGroups.set(fam, {
        displayName: fam,
        side,
        invitedToParty,
        phone,
        members: [],
      });
    }

    const group = familyGroups.get(fam);
    group.members.push({ name, isChild });
    // First phone wins; festa if any member has festa (covers Marcos family case)
    if (invitedToParty) group.invitedToParty = true;
  }

  return [...familyGroups.values(), ...individuals];
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const groups = buildGroups(rows);

  console.log(`CSV: ${rows.length} pessoas → ${groups.length} grupos`);

  const deleted = await prisma.guestGroup.deleteMany({});
  console.log(`Removidos ${deleted.count} grupos existentes`);

  let membersCreated = 0;
  let children = 0;

  for (const group of groups) {
    const created = await prisma.guestGroup.create({
      data: {
        displayName: group.displayName,
        side: group.side,
        inviteSent: false,
        invitedToParty: group.invitedToParty,
        phone: group.phone,
        searchNames: buildSearchNames(group.displayName, group.members),
        members: {
          create: group.members.map((member, index) => ({
            name: member.name,
            isChild: member.isChild,
            sortOrder: index,
          })),
        },
      },
      include: { members: true },
    });
    membersCreated += created.members.length;
    children += created.members.filter((m) => m.isChild).length;
  }

  const finalGroups = await prisma.guestGroup.count();
  const finalMembers = await prisma.guestMember.count();
  const finalChildren = await prisma.guestMember.count({ where: { isChild: true } });
  const partyGroups = await prisma.guestGroup.count({ where: { invitedToParty: true } });

  console.log(
    JSON.stringify(
      {
        groupsCreated: groups.length,
        membersCreated,
        childrenMarked: children,
        db: { finalGroups, finalMembers, finalChildren, partyGroups },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
