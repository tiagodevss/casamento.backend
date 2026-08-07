import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuestSide } from '@prisma/client';

export class GuestMemberInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(2)
  name!: string;
}

export class CreateGuestGroupDto {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchNames?: string[];

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => GuestMemberInputDto)
  members!: GuestMemberInputDto[];

  @IsEnum(GuestSide)
  side!: GuestSide;

  @IsOptional()
  @IsBoolean()
  inviteSent?: boolean;

  @IsOptional()
  @IsBoolean()
  invitedToParty?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateGuestGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchNames?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => GuestMemberInputDto)
  members?: GuestMemberInputDto[];

  @IsOptional()
  @IsEnum(GuestSide)
  side?: GuestSide;

  @IsOptional()
  @IsBoolean()
  inviteSent?: boolean;

  @IsOptional()
  @IsBoolean()
  invitedToParty?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
