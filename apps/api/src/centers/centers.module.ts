import { Module } from '@nestjs/common';
import {
  AgentsController,
  KnowledgeController,
  MemoryController,
  PromptsController,
  SkillsController,
  WorkflowsController,
} from './centers.controller';
import { CenterRecordService } from './center-record.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  controllers: [
    PromptsController,
    AgentsController,
    SkillsController,
    WorkflowsController,
    KnowledgeController,
    MemoryController,
  ],
  providers: [CenterRecordService],
  exports: [CenterRecordService],
})
export class CentersModule {}
