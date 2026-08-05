import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import authConfig from './auth.config';
import databaseConfig from './database.config';
import { envValidationSchema } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      cache: true,

      skipProcessEnv: true,

      load: [appConfig, authConfig, databaseConfig],

      validationSchema: envValidationSchema,
    }),
  ],
})
export class ConfigurationModule {}
