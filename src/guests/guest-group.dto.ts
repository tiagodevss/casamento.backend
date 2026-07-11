import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGuestGroupDto {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  searchNames!: string[];

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
  @ArrayMinSize(1)
  @IsString({ each: true })
  searchNames?: string[];

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
