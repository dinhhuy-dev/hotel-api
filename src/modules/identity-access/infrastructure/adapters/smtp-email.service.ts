import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EmailDeliveryResult,
  EmailServicePort,
  VerificationEmailInput,
} from '../../application/ports/outbound/email-service.port';
import { createTransport, Transporter } from 'nodemailer';
import emailConfig from 'src/configs/email.config';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class SmtpEmailService implements EmailServicePort {
  private readonly logger = new Logger(SmtpEmailService.name);
  private readonly transporter: Transporter;

  constructor(
    @Inject(emailConfig.KEY)
    private readonly configuration: ConfigType<typeof emailConfig>,
  ) {
    this.transporter = createTransport({
      host: this.configuration.smtp.host,
      port: this.configuration.smtp.port,
      secure: this.configuration.smtp.secure,
      auth: {
        user: this.configuration.smtp.user,
        pass: this.configuration.smtp.password,
      },
      tls: {
        rejectUnauthorized: this.configuration.certValidation,
      },
    });
    // verify transporter at startup
    this.transporter
      .verify()
      .then(() =>
        this.logger.log(
          `SMTP ready (host=${this.configuration.smtp.host}, port=${this.configuration.smtp.port})`,
        ),
      ) // this kind of code is for when i debug connect to smtp server problem, i'll just leave it there in case something odd happen
      .catch((error: unknown) => {
        const err = error as {
          message?: string;
          code?: string;
          command?: string;
          response?: string;
          responseCode?: number;
          stack?: string;
        };

        this.logger.error({
          message: 'SMTP verification failed',
          error: {
            message: err.message,
            code: err.code,
            command: err.command,
            response: err.response,
            responseCode: err.responseCode,
          },
        });
      });
  }

  async sendVerificationEmail(
    input: VerificationEmailInput,
  ): Promise<EmailDeliveryResult> {
    try {
      const verificationUrl = new URL(this.configuration.verificationUrlBase!);

      verificationUrl.searchParams.set('token', input.token);

      await this.transporter.sendMail({
        from: this.configuration.from,
        to: input.email,
        subject: 'Email verification link from Hotel Platform',
        text: [
          'Please verify your hotel account using this link:',
          verificationUrl.toString(),
        ].join('\n\n'),
      });

      return {
        delivered: true,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          `Verification email delivery failed for account ${input.accountId}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Verification email delivery failed for account ${input.accountId}: ${String(error)}`,
        );
      }

      return { delivered: false };
    }
  }
}
