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
  WPPCONNECT_WEBHOOK_URL: Joi.string().uri().default('http://api:3000/api/whatsapp/webhook'),
  WHATSAPP_WEBHOOK_SECRET: Joi.string().allow('').default(''),
  COMMUNICATION_TIMEZONE: Joi.string().default('America/Sao_Paulo'),
  COMMUNICATION_WINDOW_START: Joi.number().integer().min(0).max(23).default(9),
  COMMUNICATION_WINDOW_END: Joi.number().integer().min(1).max(24).default(20),
});
