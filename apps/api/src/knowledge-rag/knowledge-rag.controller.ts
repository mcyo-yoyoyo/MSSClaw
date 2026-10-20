import { Body, Controller, Post } from '@nestjs/common';
import { KnowledgeRagService, type ParseDocumentDto } from './knowledge-rag.service';
import type { KbSearchDocument } from './kb-search.util';

@Controller('knowledge-rag')
export class KnowledgeRagController {
  constructor(private readonly rag: KnowledgeRagService) {}

  @Post('documents/parse')
  parse(@Body() body: ParseDocumentDto) {
    return this.rag.parseDocument(body);
  }

  @Post('search')
  search(
    @Body() body: { query: string; documents: KbSearchDocument[] },
  ) {
    return this.rag.search(body.query ?? '', body.documents ?? []);
  }

  @Post('vector/status')
  vectorStatus(@Body() body: { documents?: KbSearchDocument[] }) {
    return this.rag.vectorStatus(body?.documents ?? []);
  }

  @Post('vector/rebuild')
  rebuildVector(
    @Body() body: { documents?: KbSearchDocument[] },
  ) {
    return this.rag.rebuildVectorIndex(body?.documents ?? []);
  }
}
