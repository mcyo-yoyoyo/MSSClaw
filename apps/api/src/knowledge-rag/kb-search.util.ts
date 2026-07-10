import type { KbChunk } from './kb-chunk.util';

export interface KbSearchDocument {
  id: string;
  title: string;
  desc?: string;
  tags?: string[];
  chunkTexts?: string[];
  chunks?: number;
}

export interface KbSearchHit {
  docId: string;
  docTitle: string;
  chunkIndex: number;
  snippet: string;
  score: number;
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

export function searchKbDocuments(query: string, documents: KbSearchDocument[], limit = 5): KbSearchHit[] {
  const terms = tokenize(query);
  if (!terms.length) return [];

  const hits: KbSearchHit[] = [];

  for (const doc of documents) {
    const chunkTexts =
      doc.chunkTexts && doc.chunkTexts.length
        ? doc.chunkTexts
        : [doc.desc ?? doc.title].filter(Boolean);

    chunkTexts.forEach((text, chunkIndex) => {
      const score = scoreText(`${doc.title} ${text}`, terms);
      if (score <= 0) return;
      hits.push({
        docId: doc.id,
        docTitle: doc.title,
        chunkIndex,
        snippet: text.slice(0, 220),
        score,
      });
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function buildSearchContext(hits: KbSearchHit[]): string {
  if (!hits.length) return '';
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] 《${h.docTitle}》\n${h.snippet}${h.snippet.length >= 220 ? '…' : ''}`,
    )
    .join('\n\n');
}
