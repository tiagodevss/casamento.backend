import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './create-message.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list() {
    return this.messages.list();
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Body() dto: CreateMessageDto) {
    return this.messages.create(dto);
  }
}
