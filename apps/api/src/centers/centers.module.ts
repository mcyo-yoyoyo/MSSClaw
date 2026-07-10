import { Module } from '@nestjs/common';
import {
  AgentsController,
  KnowledgeController,
  MemoryController,
  PromptsController,
  SkillsController,
  ToolsController,
  WorkflowsController,
} from './centers.controller';
import { CenterRecordService } from './center-record.service';

@Module({
  controllers: [
    PromptsController,
    AgentsController,
    SkillsController,
    WorkflowsController,
    KnowledgeController,
    ToolsController,
    MemoryController,
  ],
  providers: [CenterRecordService],
  exports: [CenterRecordService],
})
export class CentersModule {}
