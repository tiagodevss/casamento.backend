import { BadGatewayException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface AbacateEnvelope<T> {
  data: T | null;
  success?: boolean;
  error?: string | null;
}

export interface CreateTransparentPixParams {
  amountCents: number;
  description: string;
  expiresInSeconds: number;
  metadata: Record<string, string>;
}

export interface TransparentPixResult {
  id: string;
  brCode: string;
  brCodeBase64: string;
}

@Injectable()
export class AbacatePayService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('ABACATEPAY_BASE_URL');
    this.apiKey = this.config.getOrThrow<string>('ABACATEPAY_API_KEY');
  }

  async createTransparentPix(params: CreateTransparentPixParams): Promise<TransparentPixResult> {
    const body = await this.request<{
      id: string;
      brCode: string;
      brCodeBase64: string;
    }>('post', '/transparents/create', {
      // AbacatePay's request body itself is wrapped in a top-level `data` key
      // (documented as `data.amount`, `data.description`, etc).
      data: {
        data: {
          amount: params.amountCents,
          description: params.description,
          expiresIn: params.expiresInSeconds,
          metadata: params.metadata,
        },
      },
    });

    return body;
  }

  async checkTransparentStatus(transparentId: string): Promise<{ status: string }> {
    return this.request('get', '/transparents/check', { params: { id: transparentId } });
  }

  async simulatePayment(transparentId: string): Promise<void> {
    await this.request('post', '/transparents/simulate-payment', { data: { id: transparentId } });
  }

  private async request<T>(
    method: 'get' | 'post',
    path: string,
    options: { data?: unknown; params?: unknown } = {},
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.request<AbacateEnvelope<T>>({
          method,
          url: `${this.baseUrl}${path}`,
          data: options.data,
          params: options.params,
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      );

      if (response.data.success === false || !response.data.data) {
        throw new BadGatewayException(response.data.error ?? 'Falha na resposta da AbacatePay');
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new BadGatewayException(
          `Erro ao chamar AbacatePay (${path}): ${error.response?.data?.error ?? error.message}`,
        );
      }
      throw error;
    }
  }
}
