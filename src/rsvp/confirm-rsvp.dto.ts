import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmRsvpDto {
  @IsBoolean()
  attending!: boolean;

  @IsInt()
  @Min(0)
  companionsCount!: number;

  @IsOptional()
  @IsString()
  companionNames?: string;

  @IsOptional()
  @IsString()
  diet?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
