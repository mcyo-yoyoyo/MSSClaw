import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CentersModule } from './centers/centers.module';
import { ExecutionsModule } from './executions/executions.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PersistenceModule } from './persistence/persistence.module';
import { KnowledgeRagModule } from './knowledge-rag/knowledge-rag.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WorkspacesModule,
    CentersModule,
    ExecutionsModule,
    PersistenceModule,
    KnowledgeRagModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
