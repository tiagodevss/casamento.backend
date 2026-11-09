import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { WHATSAPP_PROVIDER, WhatsAppProvider } from './whatsapp-provider.interface';

const BOOT_DELAY_MS = 15_000;
const CHECK_INTERVAL_MS = 60_000;

/**
 * O WPPConnect roda com startAllSession=false (evita colidir com o start do painel), então
 * depois de qualquer restart/deploy do container a sessão ficava parada até alguém clicar em
 * "Conectar". Este watchdog religa a sessão no boot e quando ela cai, sem exigir QR novo
 * enquanto o perfil pareado continuar válido. Uma desconexão feita pelo admin (logout) o pausa.
 */
@Injectable()
export class WhatsAppSessionWatchdog implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppSessionWatchdog.name);
  private timer?: NodeJS.Timeout;
  private bootTimer?: NodeJS.Timeout;
  private paused = false;
  private running = false;

  constructor(@Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProvider) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.WHATSAPP_WATCHDOG === 'off') return;
    this.bootTimer = setTimeout(() => void this.tick(), BOOT_DELAY_MS);
    this.timer = setInterval(() => void this.tick(), CHECK_INTERVAL_MS);
    this.bootTimer.unref?.();
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.bootTimer) clearTimeout(this.bootTimer);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  async tick() {
    if (this.paused || this.running) return;
    this.running = true;
    try {
      const status = await this.provider.getStatus();
      if (status.connected) return;
      this.logger.warn(`Sessão WhatsApp ${status.state}; tentando religar.`);
      await this.provider.startSession();
    } catch (error) {
      this.logger.warn(`Watchdog WhatsApp: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
