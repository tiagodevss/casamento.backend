import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { GiftsAdminController } from './gifts-admin.controller';
import { GiftsController } from './gifts.controller';
import { GiftsService } from './gifts.service';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [GiftsController, GiftsAdminController],
  providers: [GiftsService],
  exports: [GiftsService],
})
export class GiftsModule {}
