import type { KnowledgeMode } from './KnowledgeDock';
export function KnowledgeModeTabs({ mode, onChange }: { mode: KnowledgeMode; onChange: (mode: KnowledgeMode) => void }) {
  return <div className="knowledge-mode-tabs" role="tablist" aria-label="MAX 模式">{([
    ['solution', '找方案'], ['insight', '做洞察'], ['search', '搜工具'],
  ] as const).map(([value, label]) => <button type="button" role="tab" aria-selected={mode === value} key={value} className={mode === value ? 'selected' : ''} onClick={() => onChange(value)}>{label}</button>)}</div>;
}
