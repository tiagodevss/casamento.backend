import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './update-settings.dto';

@Controller('admin/settings')
@UseGuards(JwtStrategyGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }
}
