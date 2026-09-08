import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtStrategyGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';

class SendTestDto {
  @IsString()
  @MinLength(10)
  phone!: string;

  @IsString()
  @MinLength(1)
  message!: string;
}

@Controller('admin/whatsapp')
@UseGuards(JwtStrategyGuard)
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Get('status')
  status() {
    return this.whatsapp.status();
  }

  @Post('connect')
  connect() {
    return this.whatsapp.connect();
  }

  @Get('qrcode')
  qrcode() {
    return this.whatsapp.qrCode();
  }

  @Post('disconnect')
  disconnect() {
    return this.whatsapp.disconnect();
  }

  @Post('test')
  sendTest(@Body() dto: SendTestDto) {
    return this.whatsapp.sendText(dto.phone, dto.message);
  }
}
