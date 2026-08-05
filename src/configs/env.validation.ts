import Joi from 'joi';

const booleanValue = Joi.boolean().truthy('true').falsy('false');

const port = Joi.number().integer().min(1).max(65535);

const positiveInteger = Joi.number().integer().positive();

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .optional(),

  APP_NAME: Joi.string().trim().min(1).optional(),

  APP_HOST: Joi.string().trim().min(1).optional(),

  PORT: port.optional(),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .optional(),

  JWT_ISSUER: Joi.string().trim().min(1).optional(),

  JWT_AUDIENCE: Joi.string().trim().min(1).optional(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),

  JWT_ACCESS_TTL_MINUTES: positiveInteger.max(60).optional(),

  JWT_REFRESH_TTL_HOURS: positiveInteger.max(168).optional(),

  REFRESH_COOKIE_NAME: Joi.string().trim().min(1).optional(),

  REFRESH_COOKIE_SAME_SITE: Joi.string()
    .valid('strict', 'lax', 'none')
    .optional(),

  DB_HOST: Joi.string().trim().min(1).required(),

  DB_PORT: port.optional(),

  DB_DATABASE: Joi.string().trim().min(1).required(),

  DB_USER: Joi.string().trim().min(1).required(),

  DB_PASSWORD: Joi.string().trim().min(1).required(),

  TYPEORM_AUTOLOADENTITIES: booleanValue.optional(),

  TYPEORM_SYNCHRONIZE: booleanValue.optional(),
});
