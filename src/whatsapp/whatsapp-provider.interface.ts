export type WhatsAppConnectionStatus = {
  connected: boolean;
  state: string;
  raw?: unknown;
};

export type WhatsAppSendResult = {
  providerMessageId?: string;
  raw?: unknown;
};

export interface WhatsAppProvider {
  getStatus(): Promise<WhatsAppConnectionStatus>;
  startSession(): Promise<unknown>;
  getQrCode(): Promise<unknown>;
  disconnect(): Promise<unknown>;
  sendText(phone: string, message: string): Promise<WhatsAppSendResult>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
