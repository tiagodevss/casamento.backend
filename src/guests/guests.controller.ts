import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtStrategyGuard } from '../auth/jwt-auth.guard';
import { GuestsService } from './guests.service';
import { CreateGuestGroupDto, UpdateGuestGroupDto } from './guest-group.dto';

@Controller('guests')
@UseGuards(JwtStrategyGuard)
export class GuestsController {
  constructor(private readonly guests: GuestsService) {}

  @Get()
  list() {
    return this.guests.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.guests.get(id);
  }

  @Post()
  create(@Body() dto: CreateGuestGroupDto) {
    return this.guests.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuestGroupDto) {
    return this.guests.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.guests.remove(id);
  }
}
