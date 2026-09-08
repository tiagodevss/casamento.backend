import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt-auth.guard';
import {
  CreateCommunicationCampaignDto,
  ReplyWhatsAppMessageDto,
  ScheduleCampaignDto,
  SendGuestCommunicationDto,
  UpdateCommunicationCampaignDto,
  UpdateCommunicationTemplateDto,
} from './communications.dto';
import { CommunicationsService } from './communications.service';

@Controller('admin/communications')
@UseGuards(JwtStrategyGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  @Get('stats')
  stats() {
    return this.communications.stats();
  }

  @Get('templates')
  templates() {
    return this.communications.listTemplates();
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateCommunicationTemplateDto) {
    return this.communications.updateTemplate(id, dto);
  }

  @Get('campaigns')
  campaigns() {
    return this.communications.listCampaigns();
  }

  @Get('campaigns/:id')
  campaign(@Param('id') id: string) {
    return this.communications.getCampaign(id);
  }

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCommunicationCampaignDto) {
    return this.communications.createCampaign(dto);
  }

  @Patch('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() dto: UpdateCommunicationCampaignDto) {
    return this.communications.updateCampaign(id, dto);
  }

  @Post('campaigns/:id/preview')
  preview(@Param('id') id: string) {
    return this.communications.preview(id);
  }

  @Post('campaigns/:id/schedule')
  schedule(@Param('id') id: string, @Body() dto: ScheduleCampaignDto) {
    return this.communications.schedule(id, new Date(dto.scheduledAt));
  }

  @Post('campaigns/:id/send-now')
  sendNow(@Param('id') id: string) {
    return this.communications.sendNow(id);
  }

  @Post('campaigns/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.communications.cancel(id);
  }

  @Get('campaigns/:id/deliveries')
  deliveries(@Param('id') id: string) {
    return this.communications.listDeliveries(id);
  }

  @Post('guests/:id/send')
  sendGuest(@Param('id') id: string, @Body() dto: SendGuestCommunicationDto) {
    return this.communications.sendGuestMessage(id, dto.message);
  }

  @Get('conversations')
  conversations(@Query('needsHuman') needsHuman?: string) {
    return this.communications.listConversationMessages(needsHuman === 'true');
  }

  @Post('conversations/:id/resolve')
  resolve(@Param('id') id: string) {
    return this.communications.resolveConversationMessage(id);
  }

  @Post('conversations/:id/reply')
  reply(@Param('id') id: string, @Body() dto: ReplyWhatsAppMessageDto) {
    return this.communications.replyConversationMessage(id, dto.message);
  }
}
