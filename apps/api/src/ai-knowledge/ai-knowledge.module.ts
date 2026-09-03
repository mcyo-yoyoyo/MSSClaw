import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AiKnowledgeController } from './ai-knowledge.controller';
import { AiKnowledgeAgentRunner } from './ai-knowledge.agent';
import { AiKnowledgeResourceService } from './ai-knowledge.resources';
import { AiKnowledgeService } from './ai-knowledge.service';

@Module({
  imports: [PersistenceModule],
  controllers: [AiKnowledgeController],
  providers: [
    AiKnowledgeService,
    AiKnowledgeAgentRunner,
    AiKnowledgeResourceService,
  ],
  exports: [AiKnowledgeService],
})
export class AiKnowledgeModule {}
