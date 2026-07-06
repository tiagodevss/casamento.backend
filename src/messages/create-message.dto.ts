import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(400)
  text!: string;

  // Honeypot: real guests never see or fill this field (hidden off-screen in the form).
  // A bot filling it out is the signal we use to silently drop the submission.
  @IsOptional()
  @IsString()
  website?: string;
}
