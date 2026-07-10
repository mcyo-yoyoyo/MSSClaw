import type { PrototypeKbDocument } from '@/domain/prototype/types';

export function kbDocFromFile(file: File, collectionFilter: string): PrototypeKbDocument {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
  return {
    id: `kb-upload-${Date.now()}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    desc: '用户上传文档 · 等待向量化索引',
    collection: collectionFilter === 'all' ? 'public' : collectionFilter,
    type: ext.length <= 5 ? ext : 'FILE',
    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    pages: 0,
    clearance: 'L2',
    indexed: false,
    chunks: 0,
    tags: ['上传'],
    updatedAt: new Date().toISOString().slice(0, 10),
    author: 'Mcyo',
    chunkTexts: [],
  };
}

export async function readKbFileAsText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['txt', 'md', 'json', 'csv'].includes(ext)) {
    return file.text();
  }
  return '';
}

export function downloadKbMetadata(doc: PrototypeKbDocument) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${doc.title.replace(/[^\w\u4e00-\u9fff-]+/g, '_')}-metadata.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
