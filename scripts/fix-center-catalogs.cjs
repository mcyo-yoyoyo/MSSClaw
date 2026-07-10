const fs = require('fs');

const base = fs.readFileSync('apps/api/src/data/center-catalogs.ts', 'utf8');
const head = base.split('\nexport const WORKFLOW_CATALOG')[0];
const toolMatch = base.match(/export const TOOL_CATALOG[\s\S]*?^};/m);
if (!toolMatch) throw new Error('TOOL_CATALOG missing');

const wfSrc = fs.readFileSync('apps/web/src/domain/workflow.ts', 'utf8');
const kbSrc = fs.readFileSync('apps/web/src/domain/knowledge.ts', 'utf8');
const memSrc = fs.readFileSync('apps/web/src/domain/memory.ts', 'utf8');

const wfBlock = wfSrc
  .match(/const Q3_ATTRIBUTION[\s\S]*export const WORKFLOW_CATALOG[\s\S]*?^};/m)[0]
  .replace(/: Workflow =/g, ': Record<string, unknown> =')
  .replace(
    'export const WORKFLOW_CATALOG: Record<string, Workflow[]>',
    'export const WORKFLOW_CATALOG: Record<string, Record<string, unknown>[]>',
  );

const kbBlock = kbSrc
  .match(/const ENTERPRISE_KB[\s\S]*export const KNOWLEDGE_CATALOG[\s\S]*?^};/m)[0]
  .replace(/: KnowledgeBase =/g, ': Record<string, unknown> =')
  .replace(
    'export const KNOWLEDGE_CATALOG: Record<string, KnowledgeBase[]>',
    'export const KNOWLEDGE_CATALOG: Record<string, Record<string, unknown>[]>',
  );

const memBlock = memSrc
  .match(/const DEFAULT_POLICIES[\s\S]*const MEMORY_BY_WORKSPACE[\s\S]*?^};/m)[0]
  .replace(/: LayerPolicy\[\]/g, '')
  .replace(/: MemoryStore =/g, ': Record<string, unknown> =')
  .replace(
    'const MEMORY_BY_WORKSPACE: Record<string, MemoryStore[]>',
    'export const MEMORY_CATALOG: Record<string, Record<string, unknown>[]>',
  );

const out = [head.trimEnd(), wfBlock, kbBlock, toolMatch[0], memBlock].join('\n\n') + '\n';
fs.writeFileSync('apps/api/src/data/center-catalogs.ts', out);
console.log('fixed center-catalogs.ts', out.length);
