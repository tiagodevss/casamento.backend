import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateGiftDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  description!: string;

  @IsString()
  @MinLength(2)
  iconName!: string;

  @IsInt()
  @Min(500)
  priceCents!: number;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateGiftDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  iconName?: string;

  @IsOptional()
  @IsInt()
  @Min(500)
  priceCents?: number;

  @IsOptional()
  @IsString()
  tag?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SetGiftActiveDto {
  @IsBoolean()
  active!: boolean;
}
