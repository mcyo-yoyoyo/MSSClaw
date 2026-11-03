import { AiUsageService } from './ai-usage.service';
import { AiUsageController } from './ai-usage.controller';
import { AiKnowledgeSuggestionsService } from './ai-knowledge-suggestions.service';
import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AiKnowledgeController } from './ai-knowledge.controller';
import { AiKnowledgeAgentRunner } from './ai-knowledge.agent';
import { AiKnowledgeResourceService } from './ai-knowledge.resources';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiKnowledgePilotService } from './ai-knowledge-pilot.service';
import { AiKnowledgePilotController } from './ai-knowledge-pilot.controller';
import { AiKnowledgeInsightResources } from './ai-knowledge-insight.resources';

@Module({
  imports: [PersistenceModule],
  controllers: [AiUsageController,AiKnowledgeController, AiKnowledgePilotController],
  providers: [AiUsageService,
    AiKnowledgeService,
    AiKnowledgeAgentRunner,
    AiKnowledgeResourceService,
    AiKnowledgePilotService,
    AiKnowledgeSuggestionsService,
    AiKnowledgeInsightResources,
  ],
  exports: [AiKnowledgeService],
})
export class AiKnowledgeModule {}
