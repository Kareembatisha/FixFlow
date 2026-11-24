import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  PORT: Joi.number().port().default(3000),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // jwt
  JWT_SECRET: Joi.string().min(32).required(),

  // Database
  DB_HOST: Joi.string().required(),

  DB_PORT: Joi.number().port().required(),

  DB_USERNAME: Joi.string().required(),

  DB_PASSWORD: Joi.string().required(),

  DB_DATABASE: Joi.string().required(),

  CORS_ORIGINS: Joi.string().optional().allow(''),
});
