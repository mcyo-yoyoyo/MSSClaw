import { MenuGuard } from '../persistence/menu.guard';
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
  providers: [CenterRecordService, MenuGuard],
  exports: [CenterRecordService],
})
export class CentersModule {}
