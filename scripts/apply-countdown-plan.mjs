/**
 * Aplica o plano de mensagens dos últimos 15 dias ao banco (templates, campanhas e ingressos).
 *
 * Por que existe: `ensureDefaults()` só cria o que não existe, então editar
 * communication-defaults.ts não atualiza o que já foi gravado no banco.
 *
 * Uso (a partir da pasta backend, com DATABASE_URL no .env e `npm run build` já feito):
 *   node scripts/apply-countdown-plan.mjs            # simulação: só mostra o que mudaria
 *   node scripts/apply-countdown-plan.mjs --apply    # grava
 *
 * Seguro para rodar de novo: não recria o que já existe, não mexe em campanha que já saiu
 * do rascunho e só gera ingresso para quem ainda não tem. Nada é enviado por este script.
 */
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_CAMPAIGN_PLAN,
  DEFAULT_COMMUNICATION_TEMPLATES,
  RETIRED_TEMPLATE_KEYS,
} from '../dist/communications/communication-defaults.js';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();
const log = (message) => console.log(message);
const SENT_STATUSES = ['PROCESSING', 'SENT', 'DELIVERED', 'READ'];

const sameTemplate = (current, next) =>
  current.name === next.name &&
  (current.description ?? '') === next.description &&
  current.bodySingle === next.bodySingle &&
  current.bodyGroup === next.bodyGroup &&
  current.scope === (next.scope ?? 'GENERAL') &&
  current.active;

async function syncTemplates(tx) {
  const existing = await tx.communicationTemplate.findMany({
    include: { campaigns: { select: { id: true, name: true, status: true } } },
  });
  const byKey = new Map(existing.map((item) => [item.key, item]));
  const changedKeys = new Set();

  for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
    const current = byKey.get(template.key);
    if (!current) {
      log(`  + template novo: ${template.key}`);
      if (apply) await tx.communicationTemplate.create({ data: template });
      continue;
    }
    if (sameTemplate(current, template)) continue;

    const inFlight = current.campaigns.filter((c) => !['DRAFT', 'CANCELLED', 'EXPIRED'].includes(c.status));
    if (inFlight.length) {
      log(`  ! ${template.key} NÃO atualizado: usado por campanha já em andamento (${inFlight.map((c) => c.name).join(', ')})`);
      continue;
    }
    log(`  ~ template atualizado: ${template.key}`);
    changedKeys.add(template.key);
    if (apply) {
      await tx.communicationTemplate.update({
        where: { key: template.key },
        data: { ...template, scope: template.scope ?? 'GENERAL', active: true },
      });
    }
  }

  for (const key of RETIRED_TEMPLATE_KEYS) {
    const current = byKey.get(key);
    if (current?.active) {
      log(`  - template aposentado (desativado): ${key}`);
      if (apply) await tx.communicationTemplate.update({ where: { key }, data: { active: false } });
    }
  }
  return changedKeys;
}

async function syncCampaigns(tx, changedKeys) {
  const campaigns = await tx.communicationCampaign.findMany({
    include: {
      template: { select: { key: true } },
      deliveries: { select: { status: true } },
    },
  });
  const planKey = (name, templateKey) => `${templateKey}::${name}`;
  const wanted = new Map(DEFAULT_CAMPAIGN_PLAN.map((item) => [planKey(item.name, item.templateKey), item]));
  const present = new Set();

  for (const campaign of campaigns) {
    const key = planKey(campaign.name, campaign.template.key);
    const sentCount = campaign.deliveries.filter((d) => SENT_STATUSES.includes(d.status)).length;

    if (wanted.has(key)) {
      present.add(key);
      if (campaign.status !== 'DRAFT') continue;

      // Alterar o template invalida o preview: o mesmo vale aqui para campanhas mantidas.
      const textChanged = changedKeys.has(campaign.template.key);
      if (textChanged && campaign.previewedAt) {
        log(`  ~ preview invalidado (texto novo): ${campaign.name}`);
        if (apply) {
          await tx.communicationDelivery.deleteMany({ where: { campaignId: campaign.id } });
          await tx.communicationCampaign.update({ where: { id: campaign.id }, data: { previewedAt: null } });
        }
      }

      // Rascunho ainda intocado (sem preview) ou com texto novo: alinha público, horário e
      // validade ao plano. Um rascunho que alguém já revisou por conta própria fica como está.
      if (campaign.previewedAt && !textChanged) continue;
      const item = wanted.get(key);
      const suggested = new Date(item.suggestedAt);
      const desired = {
        audience: item.audience,
        scheduledAt: suggested.getTime() > Date.now() ? suggested : null,
        expiresAt: new Date(item.expiresAt),
      };
      const differs =
        campaign.audience !== desired.audience ||
        campaign.expiresAt?.getTime() !== desired.expiresAt.getTime() ||
        (campaign.scheduledAt?.getTime() ?? null) !== (desired.scheduledAt?.getTime() ?? null);
      if (differs) {
        log(`  ~ campanha ajustada ao plano: ${campaign.name}`);
        if (apply) await tx.communicationCampaign.update({ where: { id: campaign.id }, data: desired });
      }
      continue;
    }

    if (campaign.status !== 'DRAFT' || sentCount > 0) {
      log(`  ! campanha antiga mantida (status ${campaign.status}, ${sentCount} enviadas): ${campaign.name}`);
      continue;
    }
    log(`  - rascunho antigo removido: ${campaign.name} (${campaign.deliveries.length} destinatários de preview)`);
    if (apply) {
      await tx.communicationDelivery.deleteMany({ where: { campaignId: campaign.id } });
      await tx.communicationCampaign.delete({ where: { id: campaign.id } });
    }
  }

  const templates = await tx.communicationTemplate.findMany({
    where: { key: { in: DEFAULT_CAMPAIGN_PLAN.map((item) => item.templateKey) } },
  });
  const templateIdByKey = new Map(templates.map((item) => [item.key, item.id]));

  for (const item of DEFAULT_CAMPAIGN_PLAN) {
    if (present.has(planKey(item.name, item.templateKey))) continue;
    const scheduledAt = new Date(item.suggestedAt);
    log(`  + campanha (rascunho): ${item.suggestedAt.slice(0, 16)}  ${item.name}  [${item.audience}]`);
    if (!apply) continue;
    const templateId = templateIdByKey.get(item.templateKey);
    if (!templateId) throw new Error(`Template ${item.templateKey} não encontrado`);
    await tx.communicationCampaign.create({
      data: {
        name: item.name,
        templateId,
        audience: item.audience,
        scheduledAt: scheduledAt.getTime() > Date.now() ? scheduledAt : null,
        expiresAt: new Date(item.expiresAt),
        status: 'DRAFT',
      },
    });
  }
}

async function issueTickets(tx) {
  const groups = await tx.guestGroup.findMany({
    where: { invitedToParty: true, ticketToken: null, rsvpResponse: { partyAttending: true } },
    include: { members: { select: { attending: true } } },
  });
  const eligible = groups.filter((group) => group.members.some((member) => member.attending === true));
  log(`  ingressos a gerar: ${eligible.length}`);
  if (!apply) return;
  for (const group of eligible) {
    await tx.guestGroup.update({
      where: { id: group.id },
      data: { ticketToken: randomBytes(18).toString('base64url') },
    });
  }
}

async function main() {
  log(apply ? '== APLICANDO ==' : '== SIMULAÇÃO (nada será gravado; use --apply) ==');
  await prisma.$transaction(
    async (tx) => {
      log('\nTemplates:');
      const changedKeys = await syncTemplates(tx);
      log('\nCampanhas:');
      await syncCampaigns(tx, changedKeys);
      log('\nIngressos da festa:');
      await issueTickets(tx);
    },
    { timeout: 60_000 },
  );
  log(apply ? '\nConcluído. Todas as campanhas estão em RASCUNHO: revise o preview e agende no painel.' : '\nSimulação concluída.');
}

main()
  .catch((error) => {
    console.error('Falhou, nada foi gravado:', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
