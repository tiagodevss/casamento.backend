import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  WhatsAppConnectionStatus,
  WhatsAppProvider,
  WhatsAppSendResult,
} from '../whatsapp-provider.interface';

function findStringByKeys(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  for (const candidate of Object.values(record)) {
    if (candidate && typeof candidate === 'object') {
      const nested = findStringByKeys(candidate, keys);
      if (nested) return nested;
    }
  }
  return undefined;
}

function extractMessageId(value: unknown): string | undefined {
  const direct = findStringByKeys(value, ['providerMessageId', '_serialized', 'messageId']);
  if (direct) return direct;
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id === 'string') return record.id;
  if (record.id && typeof record.id === 'object') {
    return findStringByKeys(record.id, ['_serialized', 'id']);
  }
  return undefined;
}

@Injectable()
export class WppConnectProvider implements WhatsAppProvider {
  private token?: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get baseUrl() {
    return this.config.get<string>('WPPCONNECT_URL', 'http://wppconnect:21465').replace(/\/$/, '');
  }

  private get session() {
    return this.config.get<string>('WPPCONNECT_SESSION', 'casamento');
  }

  private get secret() {
    return this.config.get<string>('WPPCONNECT_SECRET', '');
  }

  private get webhookUrl() {
    return this.config.get<string>(
      'WPPCONNECT_WEBHOOK_URL',
      'http://api:3000/api/whatsapp/webhook',
    );
  }

  private async accessToken(): Promise<string> {
    if (this.token) return this.token;
    if (!this.secret) {
      throw new ServiceUnavailableException('WPPCONNECT_SECRET não configurado');
    }

    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/api/${encodeURIComponent(this.session)}/${encodeURIComponent(this.secret)}/generate-token`, {}),
      );
      const token = response.data?.token ?? response.data?.full?.replace(/^wppconnect:/, '');
      if (!token) throw new Error('Token não retornado pelo WPPConnect');
      this.token = token;
      return token;
    } catch (error) {
      throw this.connectionError(error);
    }
  }

  private async request<T>(method: 'get' | 'post', path: string, body?: unknown): Promise<T> {
    const token = await this.accessToken();
    try {
      const response = await firstValueFrom(
        this.http.request<T>({
          method,
          url: `${this.baseUrl}${path}`,
          data: body,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20_000,
        }),
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) {
        this.token = undefined;
      }
      throw this.connectionError(error);
    }
  }

  private connectionError(error: any): ServiceUnavailableException {
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      'Falha ao comunicar com o WPPConnect';
    return new ServiceUnavailableException(String(message));
  }

  async getStatus(): Promise<WhatsAppConnectionStatus> {
    const raw = await this.request<unknown>(
      'get',
      `/api/${encodeURIComponent(this.session)}/check-connection-session`,
    );
    const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const connected = record.status === true;
    const state = connected
      ? 'CONNECTED'
      : (findStringByKeys(raw, ['message', 'state', 'sessionStatus']) ?? 'DISCONNECTED').toUpperCase();
    return { connected, state, raw };
  }

  startSession() {
    return this.request(
      'post',
      `/api/${encodeURIComponent(this.session)}/start-session`,
      { webhook: this.webhookUrl, waitQrCode: false },
    );
  }

  async getQrCode() {
    const token = await this.accessToken();
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.baseUrl}/api/${encodeURIComponent(this.session)}/qrcode-session`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'arraybuffer',
          timeout: 20_000,
          validateStatus: () => true,
        }),
      );

      const contentType = String(response.headers?.['content-type'] ?? '');
      if (response.status >= 200 && response.status < 300 && contentType.includes('image/')) {
        const bytes = Buffer.from(response.data);
        return {
          qrCode: `data:${contentType.split(';')[0] || 'image/png'};base64,${bytes.toString('base64')}`,
          raw: { contentType, size: bytes.length },
        };
      }

      const text = Buffer.from(response.data).toString('utf8');
      let raw: unknown = text;
      try {
        raw = JSON.parse(text);
      } catch {
        // Keep the text response for diagnostics.
      }
      if (response.status < 200 || response.status >= 300) {
        throw new Error(findStringByKeys(raw, ['message', 'error']) ?? `HTTP ${response.status}`);
      }
      const qrCode = findStringByKeys(raw, ['qrcode', 'qrCode', 'base64', 'urlCode']);
      return { qrCode: qrCode ?? null, raw };
    } catch (error) {
      throw this.connectionError(error);
    }
  }

  disconnect() {
    return this.request(
      'post',
      `/api/${encodeURIComponent(this.session)}/logout-session`,
      {},
    );
  }

  async sendText(phone: string, message: string): Promise<WhatsAppSendResult> {
    const raw = await this.request<unknown>(
      'post',
      `/api/${encodeURIComponent(this.session)}/send-message`,
      { phone, isGroup: false, isNewsletter: false, isLid: false, message },
    );
    return { providerMessageId: extractMessageId(raw), raw };
  }
}
