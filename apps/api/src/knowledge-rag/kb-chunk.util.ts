export interface KbChunk {
  index: number;
  text: string;
}

export function chunkText(text: string, chunkSize = 480): KbChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks: KbChunk[] = [];
  const paragraphs = normalized.split(/\n{2,}/);

  let buffer = '';
  const flush = () => {
    if (!buffer.trim()) return;
    chunks.push({ index: chunks.length, text: buffer.trim() });
    buffer = '';
  };

  for (const raw of paragraphs) {
    const para = raw.trim();
    if (!para) continue;

    if (para.length > chunkSize) {
      flush();
      for (let i = 0; i < para.length; i += chunkSize) {
        chunks.push({ index: chunks.length, text: para.slice(i, i + chunkSize) });
      }
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${para}` : para;
    if (candidate.length <= chunkSize) {
      buffer = candidate;
    } else {
      flush();
      buffer = para;
    }
  }

  flush();
  return chunks;
}

export function estimateChunksFromSize(sizeBytes: number): number {
  return Math.max(1, Math.ceil(sizeBytes / 2048));
}
