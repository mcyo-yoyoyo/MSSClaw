import { apiUrl, isApiEnabled } from '@/api/client';
import type { PrototypeKbDocument } from '@/domain/prototype/types';
import {
  buildKbArtifact,
  chunkTextLocal,
  searchKbLocal,
  type KbArtifact,
  type KbCitation,
} from '@/domain/kbSearch';

export interface ParseKbResult {
  chunkCount: number;
  chunks: { index: number; text: string }[];
  preview: string;
}

export interface KbVectorStatus {
  engine: string;
  mode: string;
  version?: string;
  healthy: boolean;
  indexedChunks?: number;
  documentCount?: number;
  dimensions?: number;
}

function toKbPayload(docs: PrototypeKbDocument[]) {
  return docs.map((d) => ({
    id: d.id,
    title: d.title,
    desc: d.desc,
    tags: d.tags,
    chunkTexts: d.chunkTexts,
    chunks: d.chunks,
  }));
}

export async function parseKbDocument(
  workspaceId: string,
  params: { filename: string; content?: string; sizeBytes?: number },
): Promise<ParseKbResult> {
  if (isApiEnabled()) {
    try {
      const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-rag/documents/parse`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = (await res.json()) as ParseKbResult;
        return data;
      }
    } catch {
      // fallback below
    }
  }

  const texts = chunkTextLocal(params.content ?? '');
  const chunks =
    texts.length > 0
      ? texts.map((text, index) => ({ index, text }))
      : [{ index: 0, text: `${params.filename} · 已登记（本地解析）` }];

  return {
    chunkCount: chunks.length,
    chunks,
    preview: chunks
      .slice(0, 2)
      .map((c) => c.text)
      .join('\n\n')
      .slice(0, 400),
  };
}

export async function fetchKbVectorStatus(
  workspaceId: string,
  docs: PrototypeKbDocument[],
): Promise<KbVectorStatus> {
  const indexed = docs.filter((d) => d.indexed);

  if (isApiEnabled()) {
    try {
      const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-rag/vector/status`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: toKbPayload(indexed) }),
      });
      if (res.ok) return (await res.json()) as KbVectorStatus;
    } catch {
      /* fallback */
    }
  }

  const chunks = indexed.reduce((n, d) => n + (d.chunkTexts?.length ?? d.chunks ?? 0), 0);
  return {
    engine: 'local-keyword',
    mode: 'keyword',
    healthy: true,
    indexedChunks: chunks,
    documentCount: indexed.length,
  };
}

export async function rebuildKbVectorIndex(
  workspaceId: string,
  docs: PrototypeKbDocument[],
): Promise<{ message?: string; indexedChunks?: number }> {
  const indexed = docs.filter((d) => d.indexed);

  if (isApiEnabled()) {
    try {
      const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-rag/vector/rebuild`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: toKbPayload(indexed) }),
      });
      if (res.ok) return (await res.json()) as { message?: string; indexedChunks?: number };
    } catch {
      /* fallback */
    }
  }

  const chunks = indexed.reduce((n, d) => n + (d.chunkTexts?.length ?? d.chunks ?? 0), 0);
  return { message: `本地索引已同步 · ${chunks} chunks`, indexedChunks: chunks };
}

export async function searchKbDocuments(
  workspaceId: string,
  query: string,
  docs: PrototypeKbDocument[],
): Promise<KbArtifact> {
  const indexed = docs.filter((d) => d.indexed);

  if (isApiEnabled()) {
    try {
      const res = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/knowledge-rag/search`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          documents: toKbPayload(indexed),
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          hits: { docId: string; docTitle: string; snippet: string; score: number }[];
          contextText: string;
          mode?: string;
          engine?: string;
        };
        const citations: KbCitation[] = data.hits.map((h, i) => ({
          index: i + 1,
          docId: h.docId,
          docTitle: h.docTitle,
          snippet: h.snippet,
          score: h.score,
        }));
        const artifact = buildKbArtifact(query, citations);
        return {
          ...artifact,
          retrievalMode: data.mode ?? 'keyword',
          retrievalEngine: data.engine,
        };
      }
    } catch {
      // fallback
    }
  }

  return buildKbArtifact(query, searchKbLocal(query, indexed));
}

export async function resolveKbContextForTask(
  workspaceId: string,
  query: string,
  docs: PrototypeKbDocument[],
): Promise<KbArtifact> {
  return searchKbDocuments(workspaceId, query, docs);
}
