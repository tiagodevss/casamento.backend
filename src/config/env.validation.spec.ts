import { envValidationSchema } from './env.validation';

const base = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: '1234567890123456',
  ABACATEPAY_API_KEY: 'key',
  ABACATEPAY_WEBHOOK_SECRET: 'secret',
  WPPCONNECT_SECRET: 'w'.repeat(40),
  WHATSAPP_WEBHOOK_SECRET: 'h'.repeat(40),
  COMMUNICATION_TIMEZONE: 'America/Sao_Paulo',
  COMMUNICATION_WINDOW_START: 9,
  COMMUNICATION_WINDOW_END: 20,
};

describe('envValidationSchema communications safety', () => {
  it('rejects the public webhook placeholder in production', () => {
    const result = envValidationSchema.validate({
      ...base,
      WHATSAPP_WEBHOOK_SECRET: 'change-me-webhook-secret',
    });
    expect(result.error).toBeDefined();
  });

  it('rejects inverted communication windows', () => {
    const result = envValidationSchema.validate({
      ...base,
      COMMUNICATION_WINDOW_START: 20,
      COMMUNICATION_WINDOW_END: 9,
    });
    expect(result.error).toBeDefined();
  });

  it('rejects invalid IANA timezones', () => {
    const result = envValidationSchema.validate({
      ...base,
      COMMUNICATION_TIMEZONE: 'Mars/Olympus',
    });
    expect(result.error).toBeDefined();
  });

  it('accepts a valid production communications configuration', () => {
    const result = envValidationSchema.validate(base);
    expect(result.error).toBeUndefined();
  });
});
