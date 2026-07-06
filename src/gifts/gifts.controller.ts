import { Controller, Get } from '@nestjs/common';
import { GiftsService } from './gifts.service';

@Controller('gifts')
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get()
  list() {
    return this.gifts.listActive();
  }
}
