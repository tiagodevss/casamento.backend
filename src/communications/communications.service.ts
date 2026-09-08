import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import {
  CommunicationAudience,
  CommunicationCampaignStatus,
  CommunicationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { normalizeBrazilPhone } from '../whatsapp/phone.util';
import {
  CreateCommunicationCampaignDto,
  UpdateCommunicationCampaignDto,
  UpdateCommunicationTemplateDto,
} from './communications.dto';
import {
  DEFAULT_CAMPAIGN_PLAN,
  DEFAULT_COMMUNICATION_TEMPLATES,
} from './communication-defaults';

const WEDDING_AT = new Date('2026-11-14T16:00:00-03:00');
const CEREMONY_MAPS =
  'https://www.google.com/maps/search/?api=1&query=Igreja+Universal+Paulínia+Av.+José+Paulino+610+Centro+Paulínia+SP';
const PARTY_MAPS = 'https://maps.app.goo.gl/xCx15d8vKrzTXubV8';

const groupInclude = {
  members: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  rsvpResponse: true,
} satisfies Prisma.GuestGroupInclude;

type CommunicationGroup = Prisma.GuestGroupGetPayload<{ include: typeof groupInclude }>;

type CampaignWithTemplate = Prisma.CommunicationCampaignGetPayload<{
  include: { template: true };
}>;

type EligibilityResult = { eligible: true } | { eligible: false; reason: string };

@Injectable()
export class CommunicationsService implements OnModuleInit {
  private readonly logger = new Logger(CommunicationsService.name);
  private workerBusy = false;
  private schedulerBusy = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async ensureDefaults() {
    const keys = DEFAULT_COMMUNICATION_TEMPLATES.map((item) => item.key);
    const existing = await this.prisma.communicationTemplate.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((item) => item.key));

    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      if (existingKeys.has(template.key)) continue;
      await this.prisma.communicationTemplate.create({ data: template });
    }

    const campaignCount = await this.prisma.communicationCampaign.count();
    if (campaignCount > 0) return;

    const templates = await this.prisma.communicationTemplate.findMany({
      where: { key: { in: DEFAULT_CAMPAIGN_PLAN.map((item) => item.templateKey) } },
    });
    const byKey = new Map(templates.map((item) => [item.key, item]));

    for (const item of DEFAULT_CAMPAIGN_PLAN) {
      const template = byKey.get(item.templateKey);
      if (!template) continue;
      await this.prisma.communicationCampaign.create({
        data: {
          name: item.name,
          templateId: template.id,
          audience: item.audience,
          scheduledAt: new Date(item.suggestedAt),
          status: CommunicationCampaignStatus.DRAFT,
        },
      });
    }
  }

  listTemplates() {
    return this.prisma.communicationTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async updateTemplate(id: string, dto: UpdateCommunicationTemplateDto) {
    await this.requireTemplate(id);
    const updated = await this.prisma.communicationTemplate.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        bodySingle: dto.bodySingle.trim(),
        bodyGroup: dto.bodyGroup.trim(),
        active: dto.active,
      },
    });
    await this.prisma.communicationCampaign.updateMany({
      where: {
        templateId: id,
        status: { in: [CommunicationCampaignStatus.DRAFT, CommunicationCampaignStatus.SCHEDULED] },
      },
      data: { previewedAt: null, status: CommunicationCampaignStatus.DRAFT },
    });
    return updated;
  }

  listCampaigns() {
    return this.prisma.communicationCampaign.findMany({
      include: { template: true, _count: { select: { deliveries: true } } },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id },
      include: { template: true, _count: { select: { deliveries: true } } },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return campaign;
  }

  async createCampaign(dto: CreateCommunicationCampaignDto) {
    await this.requireTemplate(dto.templateId);
    if (dto.audience === CommunicationAudience.CUSTOM && !(dto.includeGuestGroupIds?.length)) {
      throw new BadRequestException('Selecione ao menos um convite para uma campanha personalizada');
    }
    return this.prisma.communicationCampaign.create({
      data: {
        name: dto.name.trim(),
        templateId: dto.templateId,
        audience: dto.audience,
        includeGuestGroupIds: dto.includeGuestGroupIds ?? [],
        requireInviteSent: dto.requireInviteSent ?? true,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
      include: { template: true },
    });
  }

  async updateCampaign(id: string, dto: UpdateCommunicationCampaignDto) {
    const campaign = await this.requireEditableCampaign(id);
    if (dto.templateId) await this.requireTemplate(dto.templateId);
    const audience = dto.audience ?? campaign.audience;
    const ids = dto.includeGuestGroupIds ?? campaign.includeGuestGroupIds;
    if (audience === CommunicationAudience.CUSTOM && ids.length === 0) {
      throw new BadRequestException('Selecione ao menos um convite para uma campanha personalizada');
    }
    return this.prisma.communicationCampaign.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        templateId: dto.templateId,
        audience: dto.audience,
        includeGuestGroupIds: dto.includeGuestGroupIds,
        requireInviteSent: dto.requireInviteSent,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        previewedAt: null,
        status: CommunicationCampaignStatus.DRAFT,
      },
      include: { template: true },
    });
  }

  async schedule(id: string, scheduledAt: Date) {
    const campaign = await this.requireEditableCampaign(id);
    await this.requireActiveTemplate(campaign.templateId);
    if (!campaign.previewedAt) throw new BadRequestException('Visualize o público antes de agendar a campanha');
    return this.prisma.communicationCampaign.update({
      where: { id },
      data: {
        scheduledAt,
        status: CommunicationCampaignStatus.SCHEDULED,
        cancelledAt: null,
      },
      include: { template: true },
    });
  }

  async sendNow(id: string) {
    const campaign = await this.requireEditableCampaign(id);
    await this.requireActiveTemplate(campaign.templateId);
    if (!campaign.previewedAt) throw new BadRequestException('Visualize o público antes de enviar a campanha');
    await this.prisma.communicationCampaign.update({
      where: { id },
      data: { scheduledAt: new Date(), status: CommunicationCampaignStatus.SCHEDULED },
    });
    await this.startCampaign(id);
    return this.getCampaign(id);
  }

  async cancel(id: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    if (
      campaign.status === CommunicationCampaignStatus.COMPLETED ||
      campaign.status === CommunicationCampaignStatus.CANCELLED
    ) {
      return campaign;
    }
    await this.prisma.$transaction([
      this.prisma.communicationCampaign.update({
        where: { id },
        data: { status: CommunicationCampaignStatus.CANCELLED, cancelledAt: new Date() },
      }),
      this.prisma.communicationDelivery.updateMany({
        where: {
          campaignId: id,
          status: { in: [CommunicationDeliveryStatus.PENDING, CommunicationDeliveryStatus.PROCESSING] },
        },
        data: {
          status: CommunicationDeliveryStatus.SKIPPED,
          skippedReason: 'CAMPAIGN_CANCELLED',
        },
      }),
    ]);
    return this.getCampaign(id);
  }

  async preview(id: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    if (!campaign.template.active) throw new BadRequestException('O template desta campanha está inativo');
    const preview = await this.buildPreview(campaign);
    await this.prisma.communicationCampaign.update({
      where: { id },
      data: { previewedAt: new Date() },
    });
    return preview;
  }

  listDeliveries(id: string) {
    return this.prisma.communicationDelivery.findMany({
      where: { campaignId: id },
      include: {
        guestGroup: {
          select: {
            displayName: true,
            members: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { queuedAt: 'asc' },
    });
  }

  async stats() {
    const [groups, optOuts, deliveryCounts, pendingHuman, campaigns, lastCampaign] = await Promise.all([
      this.prisma.guestGroup.findMany({
        select: { phoneNormalized: true, members: { select: { id: true } } },
      }),
      this.prisma.guestGroup.count({ where: { whatsappOptOut: true } }),
      this.prisma.communicationDelivery.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.whatsAppMessage.count({ where: { needsHuman: true, resolvedAt: null } }),
      this.prisma.communicationCampaign.findMany({
        where: { status: CommunicationCampaignStatus.SCHEDULED, scheduledAt: { gte: new Date() } },
        include: { template: true },
        orderBy: { scheduledAt: 'asc' },
        take: 1,
      }),
      this.prisma.communicationCampaign.findFirst({
        where: { status: CommunicationCampaignStatus.COMPLETED },
        include: { template: true },
        orderBy: { finishedAt: 'desc' },
      }),
    ]);

    const withPhone = groups.filter((group) => Boolean(group.phoneNormalized)).length;
    const peopleWithPhone = groups
      .filter((group) => Boolean(group.phoneNormalized))
      .reduce((sum, group) => sum + group.members.length, 0);
    const deliveries = Object.fromEntries(
      deliveryCounts.map((item) => [item.status, item._count._all]),
    );

    return {
      base: {
        invitationGroups: groups.length,
        withPhone,
        withoutPhone: groups.length - withPhone,
        peopleWithPhone,
        optOuts,
      },
      deliveries,
      pendingHuman,
      nextCampaign: campaigns[0] ?? null,
      lastCampaign,
    };
  }

  listConversationMessages(needsHumanOnly = false) {
    return this.prisma.whatsAppMessage.findMany({
      where: needsHumanOnly ? { needsHuman: true, resolvedAt: null } : undefined,
      include: { guestGroup: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
  }

  async resolveConversationMessage(id: string) {
    const existing = await this.prisma.whatsAppMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mensagem não encontrada');
    return this.prisma.whatsAppMessage.update({
      where: { id },
      data: { resolvedAt: new Date(), needsHuman: false },
    });
  }

  async replyConversationMessage(id: string, message: string) {
    const existing = await this.prisma.whatsAppMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mensagem não encontrada');
    await this.whatsapp.sendText(existing.phone, message.trim(), existing.guestGroupId ?? undefined);
    await this.resolveConversationMessage(id);
    return { ok: true };
  }

  async sendGuestMessage(guestGroupId: string, message: string) {
    const guest = await this.prisma.guestGroup.findUnique({ where: { id: guestGroupId } });
    if (!guest) throw new NotFoundException('Convidado não encontrado');
    if (guest.whatsappOptOut) throw new BadRequestException('Este convite optou por não receber mensagens');
    const phone = guest.phoneNormalized ?? normalizeBrazilPhone(guest.phone);
    if (!phone) throw new BadRequestException('Este convite não possui um telefone válido');
    return this.whatsapp.sendText(phone, message.trim(), guest.id);
  }

  @Interval(60_000)
  async scheduleDueCampaigns() {
    if (this.schedulerBusy) return;
    this.schedulerBusy = true;
    try {
      const due = await this.prisma.communicationCampaign.findMany({
        where: {
          status: CommunicationCampaignStatus.SCHEDULED,
          previewedAt: { not: null },
          scheduledAt: { lte: new Date() },
        },
        select: { id: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      });
      for (const campaign of due) {
        await this.startCampaign(campaign.id);
      }
    } catch (error) {
      this.logger.error(`Falha ao iniciar campanhas agendadas: ${String(error)}`);
    } finally {
      this.schedulerBusy = false;
    }
  }

  private async startCampaign(id: string) {
    const claimed = await this.prisma.communicationCampaign.updateMany({
      where: {
        id,
        status: CommunicationCampaignStatus.SCHEDULED,
        previewedAt: { not: null },
      },
      data: { status: CommunicationCampaignStatus.PROCESSING, startedAt: new Date() },
    });
    if (claimed.count === 0) return;

    try {
      const campaign = await this.prisma.communicationCampaign.findUnique({
        where: { id },
        include: { template: true },
      });
      if (!campaign) return;
      if (!campaign.template.active) {
        await this.prisma.communicationCampaign.update({
          where: { id },
          data: { status: CommunicationCampaignStatus.DRAFT, previewedAt: null },
        });
        return;
      }
      const preview = await this.buildPreview(campaign);
      if (preview.included.length > 0) {
        await this.prisma.communicationDelivery.createMany({
          data: preview.included.map((item) => ({
            campaignId: campaign.id,
            guestGroupId: item.guestGroupId,
            phone: item.phone,
            renderedMessage: item.message,
          })),
          skipDuplicates: true,
        });
      }
      if (preview.included.length === 0) {
        await this.prisma.communicationCampaign.update({
          where: { id },
          data: { status: CommunicationCampaignStatus.COMPLETED, finishedAt: new Date() },
        });
      }
    } catch (error) {
      await this.prisma.communicationCampaign.update({
        where: { id },
        data: { status: CommunicationCampaignStatus.FAILED, finishedAt: new Date() },
      });
      throw error;
    }
  }

  @Interval(15_000)
  async processDeliveryQueue() {
    if (this.workerBusy || !this.isWithinSendWindow()) return;
    this.workerBusy = true;
    try {
      let connection;
      try {
        connection = await this.whatsapp.status();
      } catch {
        return;
      }
      if (!connection.connected) return;

      const now = new Date();
      const delivery = await this.prisma.communicationDelivery.findFirst({
        where: {
          status: CommunicationDeliveryStatus.PENDING,
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          campaign: { status: CommunicationCampaignStatus.PROCESSING },
        },
        orderBy: { queuedAt: 'asc' },
      });
      if (!delivery) {
        await this.finishIdleCampaigns();
        return;
      }

      const claimed = await this.prisma.communicationDelivery.updateMany({
        where: { id: delivery.id, status: CommunicationDeliveryStatus.PENDING },
        data: { status: CommunicationDeliveryStatus.PROCESSING },
      });
      if (!claimed.count) return;

      await this.processDelivery(delivery.id);
    } finally {
      this.workerBusy = false;
    }
  }

  private async processDelivery(deliveryId: string) {
    const delivery = await this.prisma.communicationDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        campaign: { include: { template: true } },
        guestGroup: { include: groupInclude },
      },
    });
    if (!delivery) return;

    if (delivery.campaign.status !== CommunicationCampaignStatus.PROCESSING) {
      await this.prisma.communicationDelivery.updateMany({
        where: { id: delivery.id, status: CommunicationDeliveryStatus.PROCESSING },
        data: {
          status: CommunicationDeliveryStatus.SKIPPED,
          skippedReason: 'CAMPAIGN_NOT_PROCESSING',
        },
      });
      return;
    }

    const eligibility = this.evaluateEligibility(delivery.guestGroup, delivery.campaign);
    if ('reason' in eligibility) {
      await this.prisma.communicationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: CommunicationDeliveryStatus.SKIPPED,
          skippedReason: eligibility.reason,
        },
      });
      await this.finishCampaignIfDone(delivery.campaignId);
      return;
    }

    const message = this.render(delivery.campaign.template, delivery.guestGroup);
    const currentCampaign = await this.prisma.communicationCampaign.findUnique({
      where: { id: delivery.campaignId },
      select: { status: true },
    });
    if (currentCampaign?.status !== CommunicationCampaignStatus.PROCESSING) {
      await this.prisma.communicationDelivery.updateMany({
        where: { id: delivery.id, status: CommunicationDeliveryStatus.PROCESSING },
        data: {
          status: CommunicationDeliveryStatus.SKIPPED,
          skippedReason: 'CAMPAIGN_CANCELLED_BEFORE_SEND',
        },
      });
      return;
    }
    try {
      const result = await this.whatsapp.sendText(
        delivery.phone,
        message,
        delivery.guestGroupId,
      );
      await this.prisma.communicationDelivery.update({
        where: { id: delivery.id },
        data: {
          renderedMessage: message,
          status: CommunicationDeliveryStatus.SENT,
          providerMessageId: result.providerMessageId,
          attempts: { increment: 1 },
          sentAt: new Date(),
          nextAttemptAt: null,
          lastError: null,
        },
      });
    } catch (error: any) {
      const attempts = delivery.attempts + 1;
      const failed = attempts >= 3;
      await this.prisma.communicationDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts,
          status: failed
            ? CommunicationDeliveryStatus.FAILED
            : CommunicationDeliveryStatus.PENDING,
          failedAt: failed ? new Date() : null,
          nextAttemptAt: failed ? null : new Date(Date.now() + 5 * 60_000),
          lastError: String(error?.message ?? error).slice(0, 1000),
        },
      });
    }
    await this.finishCampaignIfDone(delivery.campaignId);
  }

  private async finishIdleCampaigns() {
    const processing = await this.prisma.communicationCampaign.findMany({
      where: { status: CommunicationCampaignStatus.PROCESSING },
      select: { id: true },
      take: 20,
    });
    for (const campaign of processing) await this.finishCampaignIfDone(campaign.id);
  }

  private async finishCampaignIfDone(campaignId: string) {
    const remaining = await this.prisma.communicationDelivery.count({
      where: {
        campaignId,
        status: { in: [CommunicationDeliveryStatus.PENDING, CommunicationDeliveryStatus.PROCESSING] },
      },
    });
    if (remaining > 0) return;
    await this.prisma.communicationCampaign.updateMany({
      where: { id: campaignId, status: CommunicationCampaignStatus.PROCESSING },
      data: { status: CommunicationCampaignStatus.COMPLETED, finishedAt: new Date() },
    });
  }

  private async buildPreview(campaign: CampaignWithTemplate) {
    const groups = await this.prisma.guestGroup.findMany({
      include: groupInclude,
      orderBy: { displayName: 'asc' },
    });
    const included: Array<{
      guestGroupId: string;
      displayName: string;
      phone: string;
      memberCount: number;
      message: string;
    }> = [];
    const excluded: Array<{
      guestGroupId: string;
      displayName: string;
      memberCount: number;
      reason: string;
    }> = [];

    for (const group of groups) {
      const eligibility = this.evaluateEligibility(group, campaign);
      if ('reason' in eligibility) {
        excluded.push({
          guestGroupId: group.id,
          displayName: group.displayName,
          memberCount: group.members.length,
          reason: eligibility.reason,
        });
        continue;
      }
      const phone = group.phoneNormalized ?? normalizeBrazilPhone(group.phone);
      if (!phone) continue;
      included.push({
        guestGroupId: group.id,
        displayName: group.displayName,
        phone,
        memberCount: group.members.length,
        message: this.render(campaign.template, group),
      });
    }

    return {
      invitationCount: included.length,
      peopleCount: included.reduce((sum, item) => sum + item.memberCount, 0),
      included,
      excluded,
    };
  }

  private evaluateEligibility(
    group: CommunicationGroup,
    campaign: Pick<
      CampaignWithTemplate,
      'audience' | 'includeGuestGroupIds' | 'requireInviteSent'
    >,
  ): EligibilityResult {
    const phone = group.phoneNormalized ?? normalizeBrazilPhone(group.phone);
    if (!phone) return { eligible: false, reason: 'NO_VALID_PHONE' };
    if (group.whatsappOptOut) return { eligible: false, reason: 'WHATSAPP_OPT_OUT' };
    if (campaign.requireInviteSent && !group.inviteSent) {
      return { eligible: false, reason: 'INVITE_NOT_SENT' };
    }
    const hasPending = group.members.some((member) => member.attending == null);
    const hasConfirmed = group.members.some((member) => member.attending === true);
    const rsvpCompleted = group.members.length > 0 && !hasPending;

    switch (campaign.audience) {
      case CommunicationAudience.ALL:
        return { eligible: true };
      case CommunicationAudience.RSVP_PENDING:
        return hasPending
          ? { eligible: true }
          : { eligible: false, reason: 'RSVP_ALREADY_COMPLETED' };
      case CommunicationAudience.CONFIRMED:
        return rsvpCompleted && hasConfirmed
          ? { eligible: true }
          : { eligible: false, reason: 'NOT_CONFIRMED' };
      case CommunicationAudience.CEREMONY_ONLY_CONFIRMED:
        // This is the privacy-safe ceremony-only communication bucket: confirmed guests
        // who should NOT receive reception details, including guests invited to the party
        // who declined it or have not confirmed the reception.
        return rsvpCompleted &&
          hasConfirmed &&
          !(group.invitedToParty && group.rsvpResponse?.partyAttending === true)
          ? { eligible: true }
          : { eligible: false, reason: 'NOT_CEREMONY_ONLY_CONFIRMED' };
      case CommunicationAudience.PARTY_CONFIRMED:
        return rsvpCompleted && hasConfirmed && group.invitedToParty && group.rsvpResponse?.partyAttending === true
          ? { eligible: true }
          : { eligible: false, reason: 'NOT_PARTY_CONFIRMED' };
      case CommunicationAudience.CUSTOM:
        return campaign.includeGuestGroupIds.includes(group.id)
          ? { eligible: true }
          : { eligible: false, reason: 'NOT_SELECTED' };
      default:
        return { eligible: false, reason: 'UNSUPPORTED_AUDIENCE' };
    }
  }

  private render(
    template: { bodySingle: string; bodyGroup: string },
    group: CommunicationGroup,
  ) {
    const appUrl = this.config.get<string>('APP_URL', 'https://tiagoegabriela.com.br').replace(/\/$/, '');
    const pending = group.members.filter((member) => member.attending == null).map((member) => member.name);
    const confirmed = group.members.filter((member) => member.attending === true).map((member) => member.name);
    const declined = group.members.filter((member) => member.attending === false).map((member) => member.name);
    const daysRemaining = Math.max(0, Math.ceil((WEDDING_AT.getTime() - Date.now()) / 86_400_000));
    const body = group.members.length === 1 ? template.bodySingle : template.bodyGroup;
    const variables: Record<string, string> = {
      nome: group.displayName,
      pessoas: group.members.map((member) => member.name).join(', '),
      pendentes: pending.join(', '),
      confirmados: confirmed.join(', '),
      nao_confirmados: declined.join(', '),
      quantidade_pendentes: String(pending.length),
      dias_faltando: String(daysRemaining),
      link: `${appUrl}/?convite=${group.id}`,
      presentes: `${appUrl}/presentes?convite=${group.id}`,
      site: appUrl,
      data_casamento: '14/11/2026',
      horario_cerimonia: '16h00',
      local_cerimonia: 'Igreja Universal Paulínia',
      endereco_cerimonia: 'Av. José Paulino, 610 — Centro, Paulínia / SP',
      maps_cerimonia: CEREMONY_MAPS,
      horario_festa: 'Após a cerimônia',
      local_festa: 'Chácara',
      endereco_festa: 'Rua Praxiteles F. Neves, 63 - Patropi - Paulínia/SP',
      maps_festa: PARTY_MAPS,
    };

    return body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key: string) => {
      return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
    });
  }

  private isWithinSendWindow() {
    const timeZone = this.config.get<string>('COMMUNICATION_TIMEZONE', 'America/Sao_Paulo');
    const startHour = Number(this.config.get<string>('COMMUNICATION_WINDOW_START', '9'));
    const endHour = Number(this.config.get<string>('COMMUNICATION_WINDOW_END', '20'));
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    return hour >= startHour && hour < endHour;
  }

  private async requireTemplate(id: string) {
    const template = await this.prisma.communicationTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template não encontrado');
    return template;
  }

  private async requireActiveTemplate(id: string) {
    const template = await this.requireTemplate(id);
    if (!template.active) throw new BadRequestException('O template desta campanha está inativo');
    return template;
  }

  private async requireEditableCampaign(id: string) {
    const campaign = await this.prisma.communicationCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    if (
      campaign.status !== CommunicationCampaignStatus.DRAFT &&
      campaign.status !== CommunicationCampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException('Esta campanha não pode mais ser editada');
    }
    return campaign;
  }
}
