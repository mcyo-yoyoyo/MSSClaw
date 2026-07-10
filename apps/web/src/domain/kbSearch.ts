import type { PrototypeKbDocument } from '@/domain/prototype/types';

export interface KbCitation {
  index: number;
  docId: string;
  docTitle: string;
  snippet: string;
  score: number;
}

export interface KbArtifact {
  query: string;
  citations: KbCitation[];
  bullets: { text: string; citationIndex: number }[];
  contextText: string;
  retrievalMode?: string;
  retrievalEngine?: string;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,，。；;、/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
}

export function chunkTextLocal(text: string, chunkSize = 480): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  const paragraphs = normalized.split(/\n{2,}/);
  let buffer = '';

  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = '';
  };

  for (const raw of paragraphs) {
    const para = raw.trim();
    if (!para) continue;
    if (para.length > chunkSize) {
      flush();
      for (let i = 0; i < para.length; i += chunkSize) {
        chunks.push(para.slice(i, i + chunkSize));
      }
      continue;
    }
    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (candidate.length <= chunkSize) buffer = candidate;
    else {
      flush();
      buffer = para;
    }
  }
  flush();
  return chunks;
}

export function searchKbLocal(query: string, docs: PrototypeKbDocument[], limit = 5): KbCitation[] {
  const terms = tokenize(query);
  if (!terms.length) return [];

  const hits: KbCitation[] = [];

  for (const doc of docs.filter((d) => d.indexed)) {
    const chunkTexts =
      doc.chunkTexts && doc.chunkTexts.length
        ? doc.chunkTexts
        : [doc.desc, doc.title].filter(Boolean);

    chunkTexts.forEach((text) => {
      const score = scoreText(`${doc.title} ${text}`, terms);
      if (score <= 0) return;
      hits.push({
        index: 0,
        docId: doc.id,
        docTitle: doc.title,
        snippet: text.slice(0, 220),
        score,
      });
    });
  }

  const sorted = hits.sort((a, b) => b.score - a.score).slice(0, limit);
  return sorted.map((h, i) => ({ ...h, index: i + 1 }));
}

export function buildKbContext(citations: KbCitation[]): string {
  if (!citations.length) return '';
  return citations
    .map(
      (c) =>
        `[${c.index}] 《${c.docTitle}》\n${c.snippet}${c.snippet.length >= 220 ? '…' : ''}`,
    )
    .join('\n\n');
}

export function buildKbBullets(query: string, citations: KbCitation[]): KbArtifact['bullets'] {
  if (!citations.length) {
    return [
      {
        text: `未在知识库中命中「${query.slice(0, 40)}」相关段落，以下为通用检索建议`,
        citationIndex: 0,
      },
    ];
  }

  return citations.slice(0, 3).map((c) => ({
    text: `《${c.docTitle}》：${c.snippet.slice(0, 100)}${c.snippet.length > 100 ? '…' : ''}`,
    citationIndex: c.index,
  }));
}

export function buildKbArtifact(query: string, citations: KbCitation[]): KbArtifact {
  return {
    query,
    citations,
    bullets: buildKbBullets(query, citations),
    contextText: buildKbContext(citations),
  };
}
