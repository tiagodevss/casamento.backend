import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckinController, TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [AuthModule],
  controllers: [TicketsController, CheckinController],
  providers: [TicketsService],
})
export class TicketsModule {}
