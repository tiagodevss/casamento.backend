import { CommunicationAudience } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateCommunicationTemplateDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  bodySingle!: string;

  @IsString()
  @MinLength(1)
  bodyGroup!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateCommunicationCampaignDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsUUID()
  templateId!: string;

  @IsEnum(CommunicationAudience)
  audience!: CommunicationAudience;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  includeGuestGroupIds?: string[];

  @IsOptional()
  @IsBoolean()
  requireInviteSent?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCommunicationCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsEnum(CommunicationAudience)
  audience?: CommunicationAudience;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  includeGuestGroupIds?: string[];

  @IsOptional()
  @IsBoolean()
  requireInviteSent?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class ScheduleCampaignDto {
  @IsDateString()
  scheduledAt!: string;
}

export class SendGuestCommunicationDto {
  @IsString()
  @MinLength(1)
  message!: string;
}

export class ReplyWhatsAppMessageDto {
  @IsString()
  @MinLength(1)
  message!: string;
}
