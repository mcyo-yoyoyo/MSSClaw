import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CentersModule } from './centers/centers.module';
import { ExecutionsModule } from './executions/executions.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PersistenceModule } from './persistence/persistence.module';
import { KnowledgeRagModule } from './knowledge-rag/knowledge-rag.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { OptionalApiKeyGuard } from './common/optional-api-key.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 默认：每 IP 每分钟 6000 次（内网 NAT 友好）；可用 THROTTLE_* 覆盖
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 6000),
      },
    ]),
    PrismaModule,
    WorkspacesModule,
    CentersModule,
    ExecutionsModule,
    PersistenceModule,
    KnowledgeRagModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OptionalApiKeyGuard },
  ],
})
export class AppModule {}
