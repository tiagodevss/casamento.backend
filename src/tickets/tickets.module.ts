import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTicketsController, CheckinController, TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [AuthModule],
  controllers: [TicketsController, CheckinController, AdminTicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
