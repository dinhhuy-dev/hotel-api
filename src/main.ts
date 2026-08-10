import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigType } from '@nestjs/config';
import appConfig from './configs/app.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const logger = app.get(Logger);

  app.useLogger(logger);

  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.setGlobalPrefix('api');

  await app.listen(config.port, config.host);

  logger.log(`${config.name} is running on ${await app.getUrl()}`, 'Bootstrap');
}
void bootstrap();
