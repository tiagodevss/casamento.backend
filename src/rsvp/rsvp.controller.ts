import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { RsvpService } from './rsvp.service';
import { ConfirmRsvpDto } from './confirm-rsvp.dto';

@Controller('rsvp')
export class RsvpController {
  constructor(private readonly rsvp: RsvpService) {}

  @Get('search')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  search(@Query('q') query: string) {
    return this.rsvp.search(query);
  }

  @Post(':guestGroupId/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirm(
    @Param('guestGroupId') guestGroupId: string,
    @Body() dto: ConfirmRsvpDto,
    @Req() req: Request,
  ) {
    return this.rsvp.confirm(guestGroupId, dto, req.ip);
  }
}
