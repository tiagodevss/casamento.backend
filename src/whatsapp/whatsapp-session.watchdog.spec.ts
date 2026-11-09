import { WhatsAppSessionWatchdog } from './whatsapp-session.watchdog';

describe('WhatsAppSessionWatchdog', () => {
  const make = (connected: boolean) => {
    const provider = {
      getStatus: jest.fn().mockResolvedValue({ connected, state: connected ? 'CONNECTED' : 'CLOSED' }),
      startSession: jest.fn().mockResolvedValue({}),
    };
    return { provider, watchdog: new WhatsAppSessionWatchdog(provider as any) };
  };

  it('religa a sessão quando ela está desconectada', async () => {
    const { provider, watchdog } = make(false);
    await watchdog.tick();
    expect(provider.startSession).toHaveBeenCalledTimes(1);
  });

  it('não faz nada quando já está conectada', async () => {
    const { provider, watchdog } = make(true);
    await watchdog.tick();
    expect(provider.startSession).not.toHaveBeenCalled();
  });

  it('respeita a pausa após desconexão intencional', async () => {
    const { provider, watchdog } = make(false);
    watchdog.pause();
    await watchdog.tick();
    expect(provider.startSession).not.toHaveBeenCalled();
    watchdog.resume();
    await watchdog.tick();
    expect(provider.startSession).toHaveBeenCalledTimes(1);
  });
});
