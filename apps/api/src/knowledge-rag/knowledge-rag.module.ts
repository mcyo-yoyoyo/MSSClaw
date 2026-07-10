import { Module } from '@nestjs/common';
import { KnowledgeRagController } from './knowledge-rag.controller';
import { KnowledgeRagService } from './knowledge-rag.service';

@Module({
  controllers: [KnowledgeRagController],
  providers: [KnowledgeRagService],
  exports: [KnowledgeRagService],
})
export class KnowledgeRagModule {}
