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
  WPPCONNECT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).invalid('change-me-to-another-long-random-string').required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  // This value is interpolated into WEBHOOK_URL by Docker Compose, so reject characters
  // that would alter the query string. Empty keeps the feature safely disabled.
  WHATSAPP_WEBHOOK_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .pattern(/^[A-Za-z0-9_-]+$/)
      .invalid('change-me-webhook-secret', 'change_me_webhook_secret_32_chars_min')
      .required(),
    otherwise: Joi.string().allow('').pattern(/^[A-Za-z0-9_-]+$/).default(''),
  }),
  // Kept for backwards-compatible .env files; the provider intentionally no longer
  // overrides the WPPConnect container-level WEBHOOK_URL with this value.
  WPPCONNECT_WEBHOOK_URL: Joi.string().uri().optional(),
  COMMUNICATION_TIMEZONE: Joi.string().default('America/Sao_Paulo'),
  COMMUNICATION_WINDOW_START: Joi.number().integer().min(0).max(23).default(9),
  COMMUNICATION_WINDOW_END: Joi.number().integer().min(1).max(24).default(20),
}).custom((value, helpers) => {
  if (
    value.NODE_ENV === 'production' &&
    value.WPPCONNECT_SECRET === value.WHATSAPP_WEBHOOK_SECRET
  ) {
    return helpers.message({ custom: 'WPPCONNECT_SECRET e WHATSAPP_WEBHOOK_SECRET precisam ser diferentes' });
  }

  if (Number(value.COMMUNICATION_WINDOW_START) >= Number(value.COMMUNICATION_WINDOW_END)) {
    return helpers.message({
      custom: 'COMMUNICATION_WINDOW_START precisa ser menor que COMMUNICATION_WINDOW_END',
    });
  }

  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: value.COMMUNICATION_TIMEZONE,
    }).format(new Date());
  } catch {
    return helpers.message({
      custom: 'COMMUNICATION_TIMEZONE precisa ser um timezone IANA válido',
    });
  }

  return value;
}, 'Runtime configuration validation');
