import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });

  // 大 JSON（会话 / Marketplace）默认 Express 100kb 会静默失败
  const bodyLimit = process.env.JSON_BODY_LIMIT ?? '8mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.use(compression());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((item) => item.trim()).filter(Boolean),
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`MSS Claw API listening on http://localhost:${port}/api/v1`);
  logger.log(
    `JSON body limit=${bodyLimit}; API_KEY=${process.env.API_KEY ? 'on' : 'off'}; MAX_CONCURRENT_SSE=${process.env.MAX_CONCURRENT_SSE ?? 80}`,
  );
}

bootstrap();
