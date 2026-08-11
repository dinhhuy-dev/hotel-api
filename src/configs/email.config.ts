import { registerAs } from '@nestjs/config';
import { toBoolean, toNumber } from './config.parsers';

export default registerAs('email', () => ({
  smtp: {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },

  from: process.env.EMAIL_FROM,
  verificationUrlBase: process.env.EMAIL_VERIFICATION_URL_BASE,
  certValidation: toBoolean(process.env.CERT_VALIDATION),
}));
