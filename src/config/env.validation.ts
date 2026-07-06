import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  ABACATEPAY_API_KEY: Joi.string().required(),
  ABACATEPAY_WEBHOOK_SECRET: Joi.string().required(),
  ABACATEPAY_BASE_URL: Joi.string().default('https://api.abacatepay.com/v2'),
  CORS_ORIGIN: Joi.string().allow('').default(''),
  UPLOADS_DIR: Joi.string().default('./uploads'),
});
