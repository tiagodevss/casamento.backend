import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateGuestGroupDto {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  searchNames!: string[];

  @IsInt()
  @Min(0)
  maxCompanions!: number;

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
  @IsInt()
  @Min(0)
  maxCompanions?: number;

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
