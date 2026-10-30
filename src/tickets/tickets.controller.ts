import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtStrategyGuard } from '../auth/jwt-auth.guard';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  get(@Param('token') token: string) {
    return this.tickets.getPublicTicket(token);
  }
}

@Controller('admin/checkin')
@UseGuards(JwtStrategyGuard)
export class CheckinController {
  constructor(private readonly tickets: TicketsService) {}

  @Get(':token')
  lookup(@Param('token') token: string) {
    return this.tickets.lookup(token);
  }

  @Post(':token')
  checkIn(@Param('token') token: string) {
    return this.tickets.checkIn(token);
  }

  @Delete(':token')
  undo(@Param('token') token: string) {
    return this.tickets.undoCheckIn(token);
  }
}
