// 内网 HTTPS 代理做 MITM，证书自签；NODE_TLS_REJECT_UNAUTHORIZED=0 必须在
// undici 等 TLS 模块加载前设置，ConfigModule 运行时加载 .env 已经太晚。
// .env 里已配了该变量，但 shell 启动时未设置的话这里兜底，避免 ProxyAgent 拒绝自签证书。
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import type { Server } from 'http';
import { AppModule } from './app.module';
import { trustProxySetting } from './common/trust-proxy';
import { hasSecretKey } from './common/secret-box';

const DEFAULT_HTTP_REQUEST_TIMEOUT_MS = 600_000;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  // 模型 API Key 加密存库；缺密钥时保存和调用模型都会失败，启动时就拦下
  if (!hasSecretKey()) {
    throw new Error('LLM_KEY_SECRET 未配置：模型 API Key 加密存储需要它，见 deploy/api.env.example');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });

  // 大 JSON（会话 / Marketplace）默认 Express 100kb 会静默失败
  const bodyLimit = process.env.JSON_BODY_LIMIT ?? '150mb';
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
  // Nginx 示例通过 X-Forwarded-For 传递真实客户端 IP。只信任 loopback
  // 反代，避免匿名 PV/行为限流把所有用户错误合并到 127.0.0.1，亦避免任意来源伪造头。
  app.set('trust proxy', trustProxySetting(process.env.TRUST_PROXY));

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((item) => item.trim()).filter(Boolean),
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  const requestTimeoutMs = positiveInteger(
    process.env.HTTP_REQUEST_TIMEOUT_MS,
    DEFAULT_HTTP_REQUEST_TIMEOUT_MS,
  );
  const httpServer = app.getHttpServer() as Server;
  httpServer.requestTimeout = requestTimeoutMs;
  await app.listen(port);
  logger.log(`MSS Claw API listening on http://localhost:${port}/api/v1`);
  logger.log(
    `JSON body limit=${bodyLimit}; HTTP request timeout=${requestTimeoutMs}ms; API_KEY=${process.env.API_KEY ? 'on' : 'off'}; MAX_CONCURRENT_SSE=${process.env.MAX_CONCURRENT_SSE ?? 200}`,
  );
}

bootstrap();
