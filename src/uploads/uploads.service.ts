import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class UploadsService {
  constructor(private readonly config: ConfigService) {}

  private baseDir(): string {
    const configured = this.config.get<string>('UPLOADS_DIR');
    return configured ? path.resolve(configured) : path.resolve(process.cwd(), 'uploads');
  }

  private absPath(relative: string): string {
    return path.join(this.baseDir(), relative);
  }

  async ensureGiftsDir(): Promise<void> {
    await fs.mkdir(this.absPath('gifts'), { recursive: true });
  }

  validateImage(file: Express.Multer.File | undefined): void {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (file.size > MAX_BYTES) throw new BadRequestException('Imagem muito grande (máx. 5 MB)');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Use JPEG, PNG ou WebP.');
    }
  }

  extForMime(mime: string): string {
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    return 'webp';
  }

  async saveGiftImage(
    giftId: string,
    file: Express.Multer.File,
    oldPath?: string | null,
  ): Promise<string> {
    this.validateImage(file);
    await this.ensureGiftsDir();
    await this.deleteRelative(oldPath);
    const ext = this.extForMime(file.mimetype);
    const relative = `gifts/${giftId}.${ext}`;
    await fs.writeFile(this.absPath(relative), file.buffer);
    return relative;
  }

  async deleteRelative(relative: string | null | undefined): Promise<void> {
    if (!relative) return;
    try {
      await fs.unlink(this.absPath(relative));
    } catch {
      // arquivo já removido ou inexistente
    }
  }
}
