import { throwError } from 'rxjs';
import { WppConnectProvider } from './wppconnect.provider';
import { WhatsAppAmbiguousSendError } from '../whatsapp-provider.interface';

describe('WppConnectProvider send reliability', () => {
  it('marks transport timeouts as ambiguous instead of a retryable provider error', async () => {
    const http = {
      post: jest.fn().mockReturnValue(
        throwError(() => Object.assign(new Error('timeout'), { code: 'ECONNABORTED' })),
      ),
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          WPPCONNECT_URL: 'http://wppconnect:21465',
          WPPCONNECT_SESSION: 'casamento',
          WPPCONNECT_SECRET: 'secret',
        };
        return values[key] ?? fallback;
      }),
    };
    const provider = new WppConnectProvider(http as any, config as any);
    (provider as any).token = 'already-generated-token';

    await expect(provider.sendText('5519999999999', 'Teste')).rejects.toBeInstanceOf(
      WhatsAppAmbiguousSendError,
    );
    expect(http.post).toHaveBeenCalledTimes(1);
  });
});
