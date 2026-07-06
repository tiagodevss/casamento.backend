import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtStrategyGuard } from '../auth/jwt-auth.guard';
import { CreateGiftDto, SetGiftActiveDto, UpdateGiftDto } from './gift.dto';
import { GiftsService } from './gifts.service';

@Controller('admin/gifts')
@UseGuards(JwtStrategyGuard)
export class GiftsAdminController {
  constructor(private readonly gifts: GiftsService) {}

  @Get()
  listAll() {
    return this.gifts.listAll();
  }

  @Post()
  create(@Body() dto: CreateGiftDto) {
    return this.gifts.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGiftDto) {
    return this.gifts.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: SetGiftActiveDto) {
    return this.gifts.setActive(id, dto.active);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.gifts.setImage(id, file);
  }

  @Delete(':id/image')
  clearImage(@Param('id') id: string) {
    return this.gifts.clearImage(id);
  }
}
