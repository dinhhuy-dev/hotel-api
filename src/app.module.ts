import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigurationModule } from './configs/configuration.module';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { randomUUID } from 'node:crypto';
import { RoomCatalogModule } from './modules/room-catalog/room-catalog.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigurationModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                },
              }
            : undefined,
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },

        customLogLevel(_req, res, err) {
          if (err || res.statusCode >= 500) {
            return 'error';
          }

          if (res.statusCode >= 400) {
            return 'warn';
          }

          return 'info';
        },

        genReqId: (req, res) => {
          const incomingId = req.headers['x-request-id'];

          const requestId =
            typeof incomingId === 'string' && incomingId.length <= 100 ? incomingId : randomUUID();
          res.setHeader('x-request-id', requestId);
          return requestId;
        },
      },
    }),
    DatabaseModule,
    IdentityAccessModule,
    RoomCatalogModule,
    PricingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
