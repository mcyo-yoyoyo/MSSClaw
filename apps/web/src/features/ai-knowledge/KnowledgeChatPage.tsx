import { MaxRobot } from './MaxRobot';
import { SuggestionCarousel } from './SuggestionCarousel';
import { RecentSolutions } from './RecentSolutions';
import { KnowledgeModeTabs } from './KnowledgeModeTabs';
import { KnowledgeToolSearch, type ToolSearchState } from './KnowledgeToolSearch';
import { clearKnowledgeScroll, knowledgeNewsHref, openKnowledgeNews } from './knowledgeNavigation';
import { BackButton } from '@/components/common/BackButton';
import { SolutionDocumentReader } from './SolutionDocumentReader';
import { savedSolutionDocument, type SolutionDocument } from '@/domain/solutionDocument';
import { ToolLogo, resolveToolLogoUrl } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { skillDisplayName, skillDisplayDesc } from '@/domain/skillDisplay';
import { externalToolPresentation } from '@/domain/marketShelf';
import { canViewAsset } from '@/domain/assetVisibility';
import { useEffect, useRef, useState } from 'react';
import { knowledgeRequest } from '@/api/aiKnowledgeApi';
import { consumeAiKnowledgeEntry, consumeAiKnowledgeSolution, stageMeAiKnowledgeTab } from '@/domain/aiKnowledgeEntry';
import { loadAiKnowledgeSolutions, type AiKnowledgeSolution } from '@/domain/aiKnowledge';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { LegacyAiKnowledgePage } from './AiKnowledgePage';
import type { KnowledgeMode } from './KnowledgeDock';
import './knowledgeChat.css';

export type Source = { id: string; kind: string; label: string; description?: string; url?: string; evidence?: string; icon?: string };
export type Message = { role: 'user' | 'assistant'; text: string; sources?: Source[]; insight?: {
  range: { from: string | null; to: string; label: string }; noEvidence?: boolean;
  answer?: { intro: string; findings: { title: string; fact: string; evidence: {sourceId:string}[] }[]; implication: string; nextStep: string };
} };
function insightMessageBody(message: Message): string {
  const insight=message.insight;
  if(!insight || message.role!=='assistant') return message.text;
  const answer=insight.answer;
  if(!answer && !insight.noEvidence) return message.text.replace(/\n\n资料边界\n\n[\s\S]*?(?=\n\n|$)/,'').replace(/\n\n信息来源时间范围：[^\n]*$/,'');
  if(!answer) return `没有在${insight.range.label}的可用资料中找到与这个问题匹配的内容。\n\n可以换一个主题，或明确扩大时间范围后再查找。`;
  return [answer.intro,'关键发现',...answer.findings.map((finding,i)=>{
    const indices=[...new Set(finding.evidence.map(e=>(message.sources||[]).findIndex(s=>s.id===e.sourceId)+1))].filter(n=>n>0);
    return `${i+1}. ${finding.title}\n${finding.fact} ${indices.map(n=>`[${n}]`).join('')}`;
  }),'对你的工作有什么启发',answer.implication,answer.nextStep].filter(Boolean).join('\n\n');
}
function insightTimeRange(message: Message): string {
  const range=message.insight?.range;
  if(!range) return '';
  const date=(value:string)=>new Date(value).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'});
  return `信息来源时间范围：${range.from ? `${date(range.from)}—${date(range.to)}` : `截至${date(range.to)}（不限起始时间）`}`;
}

export type Plan = { id: string; title: string; summary: string; steps: { title: string; input: string; output: string; humanCheck: string; resourceIds: string[] }[]; limitations: string[]; sources: Source[]; createdAt?: string; model?: string; afterMessageCount?: number };
export type Session = { id: string; title: string; messages: Message[]; mode?: KnowledgeMode; understanding: Record<string,string>; needsClarification: boolean; plan?: Plan };
type History = { id: string; title: string; kind: 'session' | 'draft' | 'solution' | 'local'; updatedAt: string; saved: boolean; mode: KnowledgeMode };
type PendingMessage = { text: string; status: 'sending' | 'failed'; error?: string };
const safeUrl = (value?: string) => { if (!value) return undefined; try { const u = new URL(value || '', window.location.origin); return /^https?:$/.test(u.protocol) ? u.href : undefined; } catch { return undefined; } };
const assetUrl = (s: Source) => ['skill','agent','tool'].includes(s.kind) ? `/#/detail?type=${s.kind}&id=${encodeURIComponent(s.id.replace(/^(skill|agent|tool):/, ''))}` : undefined;
function sourceDestination(source: Source): string | undefined {
  const asset = assetUrl(source);
  if (asset && source.id.replace(/^(skill|agent|tool):/, '').trim()) return asset;
  const url = safeUrl(source.url);
  if (!url) return undefined;
  const parsed = new URL(url);
  // Historical local platform links should open this deployment, not a different machine.
  if (['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) && parsed.port === '5173') {
    return window.location.origin + parsed.pathname + parsed.search + parsed.hash;
  }
  return url;
}
export function SourceCard({ source, number, snapshot = false }: { source: Source; number: number; snapshot?: boolean }) {
  const id = source.id.replace(/^(skill|agent|tool):/, '');
  const skill = useMarketplaceStore(s => source.kind === 'skill' ? s.skills.find(a => a.id === id) : undefined);
  const agent = useMarketplaceStore(s => source.kind === 'agent' ? s.agents.find(a => a.id === id) : undefined);
  const tool = useMarketplaceStore(s => source.kind === 'tool' ? s.tools.find(a => a.id === id) : undefined);
  const user = useSessionStore(s => s.user);
  const viewer = { userId: user?.id, userName: user?.name, role: user?.platformRole,
    affiliation: { deptIds: user?.deptIds || [], regionId: user?.regionId ?? null } };
  const asset = skill || agent || tool;
  const visible = !snapshot && asset?.published && canViewAsset(asset, viewer);
  const presentation = visible && tool ? externalToolPresentation(tool) : undefined;
  const name = visible ? skill ? skillDisplayName(skill) : agent ? agent.name : presentation?.title || source.label : source.label;
  const description = (visible ? skill ? skillDisplayDesc(skill) : agent ? agent.desc : presentation?.description : source.description) || source.description || '';
  const fallbackIcon = ({ skill: 'fa-cube', agent: 'fa-robot', tool: 'fa-plug', case: 'fa-lightbulb', news: 'fa-newspaper', report: 'fa-file-lines' } as Record<string,string>)[source.kind] || 'fa-book';
  const icon = visible ? asset?.icon || fallbackIcon : source.icon || fallbackIcon;
  const logoUrl = visible && tool ? resolveToolLogoUrl(tool) : undefined;
  const news = source.kind === 'news';
  const href = news ? knowledgeNewsHref(source.id, safeUrl(source.url)) : sourceDestination(source);
  const kind = ({ skill: 'Skill', agent: 'Agent', tool: '工具', case: '案例', news: '资讯', report: '报告', guide: '平台指南' } as Record<string, string>)[source.kind] || '参考资料';
  const content = <><span className="knowledge-source-card-head"><ToolLogo name={name} logoUrl={logoUrl} icon={icon} size={32}/><span className="knowledge-source-card-heading"><span className="knowledge-source-card-title">{name}</span><span className="knowledge-source-card-meta">[{number}] {kind}</span></span></span>{description && <span className="knowledge-source-card-description" title={description}>{description.replace(/^【[^】]+】/, '').trim()}</span>}<span className="knowledge-source-card-action" aria-hidden="true">{href ? news ? '›' : '↗' : '暂无链接'}</span></>;
  return href ? <a className="knowledge-source-card" href={href} target={news && !snapshot ? undefined : '_blank'} rel={news ? undefined : 'noopener noreferrer'} aria-label={news ? `${name}，查看平台快讯` : `${name}，在新标签页打开`} title={name} onClick={news && !snapshot ? event => { if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); openKnowledgeNews(source.id, safeUrl(source.url)); } : undefined}>{content}</a>
    : <div className="knowledge-source-card unavailable" aria-disabled="true">{content}</div>;
}

export function KnowledgeMessages({ messages, snapshot = false, renderAfter }: { messages: Message[]; snapshot?: boolean; renderAfter?: (message: Message, index: number) => import('react').ReactNode }) {
 return <>{messages.map((m,i)=><article key={i} className={`knowledge-message ${m.role}`}><p>{insightMessageBody(m)}</p>{m.sources?.length ? <div className="knowledge-source-cards" aria-label="本条回复的参考来源">{m.sources.map((s,j)=><SourceCard key={s.id} source={s} number={j+1} snapshot={snapshot}/>)}</div>:null}{m.role==='assistant'&&m.insight&&<div className="knowledge-source-time">{insightTimeRange(m)}</div>}{renderAfter?.(m,i)}</article>)}</>;
}

const labels = { solution: '找方案', insight: '做洞察', intro: '平台介绍', search: '搜工具' };
const placeholders = { solution: '告诉 MAX，你想用 AI 完成什么工作……', insight: '想了解哪个主题、案例或近期变化？', intro: '想了解平台的哪个部分？', search: '输入名称或关键词搜索工具、Skill 或 Agent' };
const entryMode = (value: string | null): KnowledgeMode => value === 'insight' || value === 'intro' || value === 'search' ? value : 'solution';
const api = <T,>(path: string, body?: unknown) => knowledgeRequest<T>('/pilot' + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }, 120000);

export function AiKnowledgePage() {
  const [mode, setMode] = useState<KnowledgeMode>(() => entryMode(sessionStorage.getItem('mss-knowledge-mode')));
  const [toolSearch, setToolSearch] = useState<ToolSearchState>({ draft: '', query: '' });
  const [homeRevision, setHomeRevision] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [localPlan, setLocalPlan] = useState(false);
  const [previewVisitor, setPreviewVisitor] = useState<string | null>(() => localStorage.getItem('mss-pilot-visitor'));
  const bootstrap = useRef<{userId: string; selected: string | null; incoming: AiKnowledgeSolution | null; entry: ReturnType<typeof consumeAiKnowledgeEntry>} | null>(null);
  const [input, setInput] = useState('');
  const [inputFocused,setInputFocused]=useState(false);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [reading, setReading] = useState<SolutionDocument | null>(null);
  const [legacy, setLegacy] = useState<AiKnowledgeSolution | null>(null);
  const [openedFromHome, setOpenedFromHome] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const sessionOwner = useRef<string | null>(null);
  const lock = useRef(false);
  const userId = useSessionStore(s => s.user?.id || 'guest');
  const setView = useAppViewStore(s => s.setAppView);
  const activeView = useAppViewStore(s => s.appView);
  const refresh = async (offset = 0) => {
    const identity = userId;
    const data = await api<{sessions: History[]; hasMore: boolean; nextOffset: number}>(`/sessions?offset=${offset}`);
    if (!mounted.current || (useSessionStore.getState().user?.id || 'guest') !== identity) return;
    const local: History[] = offset === 0 && userId === 'guest' ? loadAiKnowledgeSolutions().filter(s => !data.sessions.some(h => h.id === s.id)).map(s => ({ id: s.id, title: s.title, updatedAt: s.createdAt, saved: true, kind: 'local', mode: 'solution' })) : [];
    setHistory(previous => offset ? [...previous, ...data.sessions.filter(s => !previous.some(h => h.id === s.id && h.kind === s.kind))] : [...data.sessions, ...local]);
    setNextOffset(data.hasMore ? data.nextOffset : null);
  };
  const reset = (nextMode: KnowledgeMode = mode) => { epoch.current++; lock.current=false; setBusy(false); setPendingMessage(null); setGeneratingPlan(false); setSession(null); setReading(null); setOpenedFromHome(false); setMode(nextMode); setToolSearch({ draft: '', query: '' }); setHomeRevision(value => value + 1); setInput(''); setError(''); setSource(null); setLegacy(null); setLocalPlan(false); sessionStorage.removeItem(`mss-knowledge-current:${userId}`); setConfirm(false); setShowHistory(false); };
  useEffect(() => {
    mounted.current = true;
    const requestEpoch = ++epoch.current;
    sessionOwner.current = null;
    lock.current = false; setBusy(false); setPendingMessage(null); setGeneratingPlan(false); setOpenedFromHome(false);
    if (!bootstrap.current || bootstrap.current.userId !== userId) {
      bootstrap.current = { userId, selected: sessionStorage.getItem('mss-knowledge-mode'), incoming: consumeAiKnowledgeSolution(), entry: consumeAiKnowledgeEntry() };
      sessionStorage.removeItem('mss-knowledge-mode');
    }
    const { selected, incoming, entry } = bootstrap.current;
    if(selected) sessionStorage.removeItem(`mss-knowledge-current:${userId}`);
    setSession(null); setReading(null); setHistory([]); setLegacy(incoming); setLocalPlan(Boolean(incoming && loadAiKnowledgeSolutions().some(s => s.id === incoming.id))); setSource(null); setConfirm(false); setError(''); setInput(entry?.question || '');
    setToolSearch({ draft: '', query: '' }); setMode(entryMode(selected));
    const last = sessionStorage.getItem(`mss-knowledge-current:${userId}`);
    if (!selected && !incoming && !entry && last) api<Session>(`/sessions/${encodeURIComponent(last)}`).then(s => { if (mounted.current && requestEpoch === epoch.current) { sessionOwner.current = userId; setSession(s); setMode(s.mode || 'solution'); } }).catch(() => { if (requestEpoch === epoch.current) sessionStorage.removeItem(`mss-knowledge-current:${userId}`); });
    refresh().catch(e => { if (mounted.current && requestEpoch === epoch.current) setError(e.message); });
    return () => { mounted.current = false; epoch.current++; };
  }, [userId]);
  useEffect(() => {
    const open = () => {
      const next = entryMode(sessionStorage.getItem('mss-knowledge-mode'));
      sessionStorage.removeItem('mss-knowledge-mode'); clearKnowledgeScroll(); reset(next);
    };
    const solution = () => {
      const saved = consumeAiKnowledgeSolution(); if (!saved) return;
      clearKnowledgeScroll(); reset('solution'); setLegacy(saved);
      setLocalPlan(userId === 'guest' && loadAiKnowledgeSolutions().some(item => item.id === saved.id));
    };
    const question = () => {
      const entry = consumeAiKnowledgeEntry(); if (!entry) return;
      clearKnowledgeScroll(); reset('solution'); setInput(entry.question);
    };
    window.addEventListener('mss-max-open', open); window.addEventListener('mss-max-solution', solution); window.addEventListener('mss-max-question', question);
    return () => { window.removeEventListener('mss-max-open', open); window.removeEventListener('mss-max-solution', solution); window.removeEventListener('mss-max-question', question); };
  }, [userId, mode]);
  useEffect(() => { if (useAppViewStore.getState().appView === 'ai-knowledge') scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: 'smooth' }); }, [session, busy, pendingMessage]);
  useEffect(() => { if (session?.id && sessionOwner.current === userId) sessionStorage.setItem(`mss-knowledge-current:${userId}`, session.id); }, [session?.id, userId]);
  const accept = (s: Session) => { sessionOwner.current = userId; setSession(s); setPendingMessage(null); setOpenedFromHome(false); setMode(s.mode || 'solution'); setSource(null); };
  const send = async (retryText?: string) => {
    if (mode === 'search') return;
    const text = (retryText ?? input).trim(); if (!text || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setPendingMessage({ text, status: 'sending' });
    if (retryText === undefined) setInput('');
    const currentEpoch = epoch.current;
    try {
      const next = await api<Session>(session ? `/sessions/${session.id}/messages` : '/sessions', { message: text, mode });
      if (mounted.current && currentEpoch === epoch.current) {
        accept(next);
        void refresh().catch(() => { if (mounted.current && currentEpoch === epoch.current) setError('回复已保存，历史列表暂未刷新，请稍后重新打开。'); });
      }
    } catch (e) { if (mounted.current && currentEpoch === epoch.current) setPendingMessage({ text, status: 'failed', error: (e as Error).message || '暂时未能获得回复，请重试。' }); }
    finally { if (mounted.current && currentEpoch === epoch.current) { lock.current = false; setBusy(false); } }
  };
  const openHistory = async (h: History) => {
    if (lock.current) return; setReading(null); setOpenedFromHome(false); setPendingMessage(null); lock.current = true; setBusy(true); setError(''); const currentEpoch = ++epoch.current;
    try {
      if (h.kind === 'solution') {
        const data = await knowledgeRequest<{solution: AiKnowledgeSolution}>(`/solutions/${encodeURIComponent(h.id)}`);
        if (mounted.current && currentEpoch === epoch.current) { setLegacy(data.solution); setLocalPlan(false); }
      } else if (h.kind === 'local') {
        const old = loadAiKnowledgeSolutions().find(s => s.id === h.id); if (old) { setLegacy(old); setLocalPlan(true); }
      } else {
        const next = h.kind === 'draft' ? await api<Session>(`/legacy/draft/${encodeURIComponent(h.id)}/resume`, {}) : await api<Session>(`/sessions/${encodeURIComponent(h.id)}`);
        if (mounted.current && currentEpoch === epoch.current) { setLegacy(null); accept(next); }
      }
      setShowHistory(false);
    } catch(e) { if (mounted.current && currentEpoch === epoch.current) setError((e as Error).message); }
    finally { if (mounted.current && currentEpoch === epoch.current) { lock.current = false; setBusy(false); } }
  };
  const documentFromSession = (s: Session): SolutionDocument | null => s.plan ? ({ schemaVersion:1, ...s.plan,
    createdAt: s.plan.createdAt || new Date().toISOString(), sourceSessionId:s.id, understanding:s.understanding,
    originalQuestion:s.messages.find(m=>m.role==='user')?.text, deliverables:[...new Set(s.plan.steps.map(step=>step.output).filter(Boolean))] }) : null;
  const generate = async () => {
    if (!session || lock.current || pendingMessage) return; lock.current = true; setBusy(true); setGeneratingPlan(true); setConfirm(false); setError(''); const currentEpoch = epoch.current;
    try { const next = await api<Session>(`/sessions/${session.id}/plan`, { confirmed: true }); if (mounted.current && currentEpoch === epoch.current) { accept(next); setReading(documentFromSession(next)); void refresh().catch(() => { if (mounted.current && currentEpoch === epoch.current) setError('方案已保存，历史列表暂未刷新，请稍后重新打开。'); }); } }
    catch(e) { if (mounted.current && currentEpoch === epoch.current) setError((e as Error).message); }
    finally { if (mounted.current && currentEpoch === epoch.current) { lock.current = false; setBusy(false); setGeneratingPlan(false); } }
  };
  const resumeSolution = async () => {
    if (!legacy || lock.current) return; lock.current = true; setBusy(true); setError(''); const requestEpoch = epoch.current;
    try { const next = localPlan ? await api<Session>('/import-local', { originalQuestion: legacy.originalQuestion, demand: legacy.demand, messages: legacy.messages.map(({role,text}) => ({role,text})) }) : await api<Session>(`/legacy/solution/${encodeURIComponent(legacy.id)}/resume`, {}); if (mounted.current && requestEpoch === epoch.current) { accept(next); setLegacy(null); await refresh(); } }
    catch(e) { setError((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  };
  const importPreview = async () => {
    if (!previewVisitor || lock.current) return; lock.current = true; setBusy(true); setError(''); const requestEpoch = epoch.current;
    try { await api('/import-preview', { visitorId: previewVisitor }); if (mounted.current && requestEpoch === epoch.current) { await refresh(); setPreviewVisitor(null); } }
    catch(e) { setError((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  };
  const myPlans = () => { stageMeAiKnowledgeTab(); setView('me'); };
  const hasConversation = Boolean(session || pendingMessage);
  const showSuggestions = activeView === 'ai-knowledge' && !hasConversation && !busy && !input && !inputFocused;
  const displayedDocument = reading || (legacy ? savedSolutionDocument(legacy) : null);
  if (mode === 'search' && !displayedDocument && !legacy) return <KnowledgeToolSearch state={toolSearch} onChange={setToolSearch} onModeChange={setMode}/>;
  if (displayedDocument) return <SolutionDocumentReader document={displayedDocument} backLabel={openedFromHome ? '返回MAX首页' : '返回对话'} onBack={() => {
    if (openedFromHome) { setReading(null); setLegacy(null); setLocalPlan(false); setOpenedFromHome(false); return; }
    const sourceId=displayedDocument.sourceSessionId;setReading(null);setLegacy(null);
    if(sourceId && session?.id!==sourceId) api<Session>(`/sessions/${encodeURIComponent(sourceId)}`).then(accept).catch(e=>setError(e.message));
  }} onMyPlans={myPlans} renderSource={(source,i)=><SourceCard key={source.id} source={source} number={i+1}/>}/>;
  if (legacy) return <div className="knowledge-legacy"><div className="knowledge-legacy-bar"><BackButton label={openedFromHome ? '返回MAX首页' : '返回MAX对话'} onClick={() => reset()}/><button disabled={busy} onClick={resumeSolution}>继续此方案的对话</button><button onClick={myPlans}>我的方案</button></div>{error && <p role="alert">{error}</p>}<LegacyAiKnowledgePage key={legacy.id} initialSolution={legacy} onNew={() => reset('solution')}/></div>;
  return <div className={`knowledge-chat ${hasConversation ? '' : 'empty'}`}>
    <main className="knowledge-main">
      <header className="knowledge-top"><BackButton label={hasConversation || busy ? "返回MAX首页" : "返回平台"} onClick={() => { if(hasConversation || busy) reset('solution'); else setView('home'); }}/><span className={`knowledge-mode-label ${mode==='insight' ? 'is-insight' : ''}`}>{labels[mode]}</span></header>
      <div className="knowledge-scroll" ref={scroll}>
        {session && <KnowledgeMessages messages={session.messages}/>}
        {session?.plan && <section className="knowledge-plan-summary"><small>解决方案 · 已保存</small><h2>{session.plan.title}</h2><p>{session.plan.summary}</p><button onClick={() => setReading(documentFromSession(session))}>查看完整方案 ↗</button></section>}
        {session && !pendingMessage && mode === 'solution' && !session.needsClarification && !session.plan && <button className="knowledge-confirm-button" disabled={busy} onClick={() => setConfirm(true)}>确认需求，生成方案</button>}
        {session && !pendingMessage && mode === 'insight' && <button className="knowledge-confirm-button" disabled={busy} onClick={() => { reset('solution'); setInput(('基于刚才的洞察，帮我找落地方案：' + (session.messages.filter(m => m.role === 'user').at(-1)?.text || '') + '\n洞察参考：' + (session.messages.at(-1)?.text || '')).slice(0,4000)); }}>找适合我的方案</button>}
        {pendingMessage && <article className="knowledge-message user"><p>{pendingMessage.text}</p></article>}
        {busy && <div className="knowledge-reply-status" role="status" aria-live="polite" aria-atomic="true"><strong>MAX</strong><span>{generatingPlan ? '正在生成方案' : pendingMessage?.status === 'sending' ? '正在回复' : '正在处理'}</span><span className="knowledge-reply-dots" aria-hidden="true"><i/><i/><i/></span></div>}
        {pendingMessage?.status === 'failed' && <div className="knowledge-send-failure" role="alert"><p><strong>回复失败</strong><span>{pendingMessage.error}</span></p><button type="button" disabled={busy} onClick={() => void send(pendingMessage.text)}>重新发送</button></div>}
      </div>
      <div className="knowledge-compose-area">
        {!hasConversation && activeView === 'ai-knowledge' && <MaxRobot className="knowledge-perched"/>}
        {!hasConversation && <KnowledgeModeTabs mode={mode} onChange={setMode}/>}
        {error && <div className="knowledge-error" role="alert">{error}<button onClick={() => setError('')}>关闭</button></div>}
        <form onSubmit={e => { e.preventDefault(); void send(); }}><SuggestionCarousel mode={mode} visible={showSuggestions} paused={inputFocused||busy} onSelect={text=>{if(!busy){setInput(text);inputRef.current?.focus();}}}/>{input.length>0 && <button type="button" className="knowledge-clear-input" aria-label="清空输入内容" title="清空输入内容" disabled={busy} onClick={()=>{setInput('');inputRef.current?.focus();}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>}<textarea ref={inputRef} onFocus={()=>setInputFocused(true)} onBlur={()=>setInputFocused(false)} aria-label="向MAX提问" placeholder={placeholders[mode]} value={input} maxLength={4000} disabled={busy} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><footer><button type="button" aria-label="打开历史对话" onClick={() => setShowHistory(true)}>◷</button><button type="submit" aria-label="发送" disabled={busy || !input.trim()}>↑</button></footer></form>
        <p className="knowledge-footnote">内容由 AI 生成，请结合业务实际判断</p>
        {!hasConversation && <RecentSolutions key={homeRevision} disabled={busy} onViewAll={myPlans} onOpen={(solution, isLocal) => {
          if (lock.current) return;
          epoch.current++;
          setError(''); setSource(null); setReading(null); setLocalPlan(isLocal); setOpenedFromHome(true); setLegacy(solution); setShowHistory(false);
        }}/>}
      </div>
    </main>
    {showHistory && <button className="knowledge-history-shade" aria-label="关闭历史对话" onClick={() => setShowHistory(false)}/>}
    <aside className={`knowledge-history ${showHistory ? 'open' : ''}`}><div className="knowledge-history-head"><button disabled={busy} onClick={() => { reset(); sessionStorage.removeItem(`mss-knowledge-current:${userId}`); }}>＋ 新建会话</button><button className="knowledge-mobile-history" onClick={() => setShowHistory(false)}>×</button></div><button className="knowledge-my-plans" onClick={myPlans}>我的方案</button><p>历史对话与方案</p>{previewVisitor && <button className="knowledge-preview-import" disabled={busy} onClick={() => void importPreview()}>导入此浏览器的试聊记录</button>}{history.length ? history.map(h => <button disabled={busy} title={h.title} className={session?.id===h.id ? 'active' : ''} key={h.kind+':'+h.id} onClick={() => void openHistory(h)}><span>{h.title}</span>{h.saved && <small>方案</small>}</button>) : <small>还没有对话，问一个问题开始吧</small>}{nextOffset !== null && <button disabled={busy} onClick={() => void refresh(nextOffset).catch(e => setError(e.message))}>加载更早记录</button>}</aside>
    {source && <aside className="knowledge-source"><header><span>引用来源</span><button onClick={() => setSource(null)} aria-label="关闭引用来源">×</button></header><small>{source.kind === 'skill' ? 'Skill' : source.kind === 'agent' ? 'Agent' : '参考资料'}</small><h2>{source.label}</h2><p>{source.description}</p><p>{source.evidence}</p>{source.kind === 'guide' && <nav className="knowledge-guide-links"><button onClick={() => setView('ai-brief')}>AI快讯</button><button onClick={() => setView('market-external')}>外部工具精选</button><button onClick={() => setView('market-internal')}>内部办公推荐</button><button onClick={() => setView('market-projects')}>AI工具Hub · Skill / Agent</button><button onClick={myPlans}>我的方案</button></nav>}{assetUrl(source) && <a href={assetUrl(source)}>查看能力详情</a>}{safeUrl(source.url) && <a href={safeUrl(source.url?.replace(/^http:\/\/localhost:5173/, window.location.origin))} target="_blank" rel="noopener noreferrer">查看原文</a>}</aside>}
    {confirm && <div className="knowledge-modal-shade" onKeyDown={e => { if(e.key === 'Escape') setConfirm(false); }}><section role="dialog" aria-modal="true" aria-label="确认需求" className="knowledge-modal"><h2>确认需求</h2><dl>{Object.entries(session?.understanding || {}).map(([k,v]) => <div key={k}><dt>{({task:'任务',goal:'目标',inputs:'已有输入',output:'期望产出',constraints:'限制'} as Record<string,string>)[k] || k}</dt><dd>{v || '未提供'}</dd></div>)}</dl><p>需要修改？返回对话补充即可。</p><footer><button autoFocus onClick={() => setConfirm(false)}>返回补充</button><button onClick={() => void generate()}>确认并生成</button></footer></section></div>}
  </div>;
}
