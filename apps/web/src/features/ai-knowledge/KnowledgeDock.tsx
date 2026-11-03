import { useKnowledgeGuide } from './knowledgeGuideStore';
import { useState } from 'react';
import { useAppViewStore } from '@/stores/appViewStore';
import './knowledgeChat.css';
export type KnowledgeMode = 'solution' | 'insight' | 'intro' | 'search';
export function openKnowledge(mode?: KnowledgeMode) {
  sessionStorage.setItem('mss-knowledge-mode', mode ?? 'solution');
  window.dispatchEvent(new Event('mss-max-open'));
  useAppViewStore.getState().setAppView('ai-knowledge');
}
export function KnowledgeDock() {
  const [open, setOpen] = useState(false);
  const guiding = useKnowledgeGuide(s => s.active);
  if (guiding) return null;
  return <div className={`knowledge-dock ${open ? 'open' : ''}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <nav aria-label="MAX快捷入口">{([['insight','做洞察','⌕'],['solution','找方案','✧'],['intro','平台介绍','▤']] as const).map(([mode,label,icon]) => <button key={mode} onClick={() => { setOpen(false); if (mode === 'intro') useKnowledgeGuide.getState().start(); else openKnowledge(mode); }}><span>{label}</span><i>{icon}</i></button>)}</nav>
    <button className="knowledge-touch" aria-label="展开MAX快捷入口" aria-expanded={open} onClick={() => setOpen(!open)}>···</button>
    <button className="knowledge-robot" onClick={() => openKnowledge()} aria-label="打开MAX首页"><img src="/knowledge/voxel-bot.svg" alt=""/><span>MAX</span></button>
  </div>;
}
