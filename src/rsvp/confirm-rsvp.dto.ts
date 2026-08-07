import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class MemberAttendanceDto {
  @IsUUID()
  id!: string;

  @IsBoolean()
  attending!: boolean;
}

export class ConfirmRsvpDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MemberAttendanceDto)
  members!: MemberAttendanceDto[];

  @IsOptional()
  @IsBoolean()
  partyAttending?: boolean;

  @IsOptional()
  @IsString()
  diet?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
