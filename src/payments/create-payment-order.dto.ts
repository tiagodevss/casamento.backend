import { IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { PaymentKind, PaymentMethod } from '@prisma/client';

export class CreatePaymentOrderDto {
  @IsEnum(PaymentKind)
  kind!: PaymentKind;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ValidateIf((dto: CreatePaymentOrderDto) => dto.kind === PaymentKind.FIXED_GIFT)
  @IsString()
  giftId?: string;

  @ValidateIf((dto: CreatePaymentOrderDto) => dto.kind === PaymentKind.FREE_CONTRIBUTION)
  @IsInt()
  @Min(500)
  amountCents?: number;

  @IsOptional()
  @IsString()
  donorName?: string;

  @IsOptional()
  @IsString()
  donorMessage?: string;
}
