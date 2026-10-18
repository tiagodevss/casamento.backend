import { ServiceUnavailableException } from '@nestjs/common';

export type WhatsAppConnectionStatus = {
  connected: boolean;
  state: string;
  raw?: unknown;
};

export type WhatsAppSendResult = {
  providerMessageId?: string;
  raw?: unknown;
};

/**
 * O provider pode ter aceitado a mensagem mesmo sem devolver uma resposta HTTP
 * (timeout/reset). Esses casos nunca devem ser reenviados automaticamente.
 */
export class WhatsAppAmbiguousSendError extends ServiceUnavailableException {
  constructor(message = 'O resultado do envio ao WhatsApp é incerto') {
    super(message);
    this.name = 'WhatsAppAmbiguousSendError';
  }
}

export interface WhatsAppProvider {
  getStatus(): Promise<WhatsAppConnectionStatus>;
  startSession(): Promise<unknown>;
  getQrCode(): Promise<unknown>;
  disconnect(): Promise<unknown>;
  sendText(phone: string, message: string): Promise<WhatsAppSendResult>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
