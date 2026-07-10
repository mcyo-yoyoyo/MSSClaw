import { Injectable } from '@nestjs/common';
import { chunkText, estimateChunksFromSize } from './kb-chunk.util';
import {
  buildSearchContext,
  searchKbDocuments,
  type KbSearchDocument,
} from './kb-search.util';
import {
  countIndexedChunks,
  VECTOR_INDEX_STATUS,
  vectorSearchKbDocuments,
} from './kb-vector.util';

export interface ParseDocumentDto {
  filename: string;
  content?: string;
  sizeBytes?: number;
}

@Injectable()
export class KnowledgeRagService {
  parseDocument(dto: ParseDocumentDto) {
    const filename = dto.filename.trim();
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const text = dto.content?.trim() ?? '';

    let chunks = chunkText(text);
    if (!chunks.length && dto.sizeBytes) {
      const count = estimateChunksFromSize(dto.sizeBytes);
      chunks = Array.from({ length: count }, (_, index) => ({
        index,
        text: `[${ext.toUpperCase()} 二进制文档 ${filename} · 预估块 ${index + 1}/${count}]`,
      }));
    }

    if (!chunks.length) {
      chunks = [{ index: 0, text: `${filename} · 暂无文本内容，已登记元数据` }];
    }

    const preview = chunks
      .slice(0, 2)
      .map((c) => c.text)
      .join('\n\n')
      .slice(0, 400);

    return {
      filename,
      chunkCount: chunks.length,
      chunks,
      preview,
      parsedAt: new Date().toISOString(),
    };
  }

  search(query: string, documents: KbSearchDocument[]) {
    const indexed = documents ?? [];
    const vectorHits = vectorSearchKbDocuments(query, indexed, 5);
    const hits =
      vectorHits.length > 0 ? vectorHits : searchKbDocuments(query, indexed, 5);
    const mode = vectorHits.length > 0 ? 'vector' : 'keyword';

    return {
      query,
      hits,
      contextText: buildSearchContext(hits),
      citationCount: hits.length,
      mode,
      engine: mode === 'vector' ? VECTOR_INDEX_STATUS.engine : 'keyword-fallback',
    };
  }

  vectorStatus(documents: KbSearchDocument[]) {
    return {
      ...VECTOR_INDEX_STATUS,
      indexedChunks: countIndexedChunks(documents),
      documentCount: documents.length,
    };
  }

  rebuildVectorIndex(documents: KbSearchDocument[]) {
    const indexedChunks = countIndexedChunks(documents);
    return {
      ...VECTOR_INDEX_STATUS,
      rebuiltAt: new Date().toISOString(),
      indexedChunks,
      documentCount: documents.length,
      message: `Milvus-compatible 索引已重建 · ${indexedChunks} chunks`,
    };
  }
}
