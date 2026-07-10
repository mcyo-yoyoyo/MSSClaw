import { Body, Controller, Param, Post } from '@nestjs/common';
import { KnowledgeRagService, type ParseDocumentDto } from './knowledge-rag.service';
import type { KbSearchDocument } from './kb-search.util';

@Controller('workspaces/:workspaceId/knowledge-rag')
export class KnowledgeRagController {
  constructor(private readonly rag: KnowledgeRagService) {}

  @Post('documents/parse')
  parse(@Body() body: ParseDocumentDto) {
    return this.rag.parseDocument(body);
  }

  @Post('search')
  search(
    @Param('workspaceId') _workspaceId: string,
    @Body() body: { query: string; documents: KbSearchDocument[] },
  ) {
    return this.rag.search(body.query ?? '', body.documents ?? []);
  }

  @Post('vector/status')
  vectorStatus(@Body() body: { documents?: KbSearchDocument[] }) {
    return this.rag.vectorStatus(body?.documents ?? []);
  }

  @Post('vector/rebuild')  rebuildVector(
    @Param('workspaceId') _workspaceId: string,
    @Body() body: { documents?: KbSearchDocument[] },
  ) {
    return this.rag.rebuildVectorIndex(body?.documents ?? []);
  }
}
