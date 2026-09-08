import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  ABACATEPAY_API_KEY: Joi.string().required(),
  ABACATEPAY_WEBHOOK_SECRET: Joi.string().required(),
  ABACATEPAY_BASE_URL: Joi.string().default('https://api.abacatepay.com/v2'),
  APP_URL: Joi.string().uri().optional(),
  CORS_ORIGIN: Joi.string().allow('').default(''),
  UPLOADS_DIR: Joi.string().default('./uploads'),
  WPPCONNECT_URL: Joi.string().uri().default('http://wppconnect:21465'),
  WPPCONNECT_SESSION: Joi.string().default('casamento'),
  WPPCONNECT_SECRET: Joi.string().allow('').default(''),
  // This value is interpolated into WEBHOOK_URL by Docker Compose, so reject characters
  // that would alter the query string. Empty keeps the feature safely disabled.
  WHATSAPP_WEBHOOK_SECRET: Joi.string()
    .allow('')
    .pattern(/^[A-Za-z0-9_-]+$/)
    .default(''),
  // Kept for backwards-compatible .env files; the provider intentionally no longer
  // overrides the WPPConnect container-level WEBHOOK_URL with this value.
  WPPCONNECT_WEBHOOK_URL: Joi.string().uri().optional(),
  COMMUNICATION_TIMEZONE: Joi.string().default('America/Sao_Paulo'),
  COMMUNICATION_WINDOW_START: Joi.number().integer().min(0).max(23).default(9),
  COMMUNICATION_WINDOW_END: Joi.number().integer().min(1).max(24).default(20),
});
