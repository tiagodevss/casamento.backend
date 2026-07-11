import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfirmRsvpDto {
  @IsBoolean()
  attending!: boolean;

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
