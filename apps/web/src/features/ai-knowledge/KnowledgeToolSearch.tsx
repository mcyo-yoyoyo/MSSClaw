import { useEffect } from 'react';
import { knowledgeRequest } from '@/api/aiKnowledgeApi';
import { useMemo, useRef } from 'react';
import { BackButton } from '@/components/common/BackButton';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { canViewAsset } from '@/domain/assetVisibility';
import { listMarketToolCards, listInternalOfficeMarketCards, type MarketShelfCard as Card } from '@/domain/marketShelf';
import { searchCapabilitiesByIntent } from '@/domain/capabilityIntentSearch';
import { matchesSkillHubSearch } from '@/domain/skillHubSearch';
import { matchesAgentHubSearch } from '@/domain/agentHubSearch';
import { filterInternalOfficeScenesBySearch } from '@/domain/internalOfficeSceneSearch';
import { materializeOfficeScenes } from '@/domain/internalOfficeScenes';
import { skillDisplayName, skillDisplayDesc } from '@/domain/skillDisplay';
import { assetCreatorName } from '@/domain/assetCreator';
import { getBusinessScenarioMeta } from '@/domain/businessScenarios';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { getAgentCapabilityTypeLabel, resolveAgentCapabilityTypes } from '@/domain/agentHubFilters';
import { KnowledgeModeTabs } from './KnowledgeModeTabs';
import { MaxRobot } from './MaxRobot';
import { openKnowledgeAsset } from './knowledgeNavigation';
import type { KnowledgeMode } from './KnowledgeDock';
import './knowledgeToolSearch.css';

export function useKnowledgeToolResults(query: string) {
 const tools=useMarketplaceStore(s=>s.tools),agents=useMarketplaceStore(s=>s.agents),skills=useMarketplaceStore(s=>s.skills);
 const scenes=useInternalOfficeSceneCatalogStore(s=>s.entries),user=useSessionStore(s=>s.user);
  const results = useMemo(() => {
    if (!query) return [];
    const viewer = { userId: user?.id, userName: user?.name, role: user?.platformRole, affiliation: { deptIds: user?.deptIds || [], regionId: user?.regionId ?? null } };
    const visibleTools = tools.filter(t => t.published && canViewAsset(t, viewer));
    const toolIds = new Set(visibleTools.map(t => t.id));
    const toolCards = [...listMarketToolCards(visibleTools, 'external', viewer), ...listMarketToolCards(visibleTools, 'internal', viewer),
      ...listInternalOfficeMarketCards(visibleTools, undefined, undefined, scenes.filter(s => s.visible)).filter(c => toolIds.has(c.id))];
    const uniqueTools = [...new Map(toolCards.map(c => [c.id, c])).values()];
    const matchedTools = searchCapabilitiesByIntent(query, uniqueTools, uniqueTools.length).map(hit => hit.card);
    const sceneToolIds = new Set(filterInternalOfficeScenesBySearch(materializeOfficeScenes(scenes, visibleTools), query, visibleTools).flatMap(scene => scene.tools.map(tool => tool.id)));
    const toolResults = [...new Map([...matchedTools, ...uniqueTools.filter(card => card.kind === 'internal' && sceneToolIds.has(card.id))].map(card => [card.id, card])).values()];
    const capability = (id: string, title: string, description: string, icon: string | undefined, assetType: 'skill' | 'agent', createdAt?: string): Card => ({
      id, title, description, icon: icon || (assetType === 'skill' ? 'fa-cube' : 'fa-robot'), assetType, kind: 'projects',
      badges: [{ label: assetType === 'skill' ? 'Skill' : 'Agent', tone: 'type' }], featured: false, heat: 0,
      securityLevel: 'mss', hasHowto: true, primaryAction: 'detail', createdAt,
    });
    const skillResults = skills.filter(s => s.published && canViewAsset(s, viewer)).filter(s => matchesSkillHubSearch({
      title: [skillDisplayName(s), s.name, s.nameZh, s.nameEn].filter(Boolean).join(' '),
      description: [skillDisplayDesc(s), s.desc, s.descZh, s.descEn, assetCreatorName(s)].filter(Boolean).join(' '), instructions: s.instructions,
    }, query)).map(s => capability(s.id, skillDisplayName(s), skillDisplayDesc(s), s.icon, 'skill', s.createdAt));
    const agentResults = agents.filter(a => a.published && canViewAsset(a, viewer)).filter(a => matchesAgentHubSearch({
      title: a.name, description: a.desc, tags: [
        ...(a.scenarioTags || []), a.bizLine, a.businessScenarioId ? getBusinessScenarioMeta(a.businessScenarioId).label : '',
        ...(a.ownerDeptIds || []).map(getDeptLabel), ...(a.ownerRegionIds || []).map(getRegionLabel),
        ...resolveAgentCapabilityTypes(a).map(getAgentCapabilityTypeLabel), ...(a.targetUsers || []), ...(a.environment?.platforms || []), assetCreatorName(a),
      ].filter((value): value is string => Boolean(value)),
    }, query)).map(a => capability(a.id, a.name, a.desc, a.icon, 'agent', a.createdAt));
    return [...toolResults, ...skillResults, ...agentResults];
  }, [tools, agents, skills, scenes, user, query]);

 return results;
}

export type ToolSearchState = { draft: string; query: string };
export function KnowledgeToolSearch({ state, onChange, onModeChange }: {
  state: ToolSearchState; onChange: (state: ToolSearchState) => void; onModeChange: (mode: KnowledgeMode) => void;
}) {
  const ready = useMarketplaceStore(s => s.ready), error = useMarketplaceStore(s => s.loadError);
  const bootstrap = useMarketplaceStore(s => s.bootstrap);
  const setView = useAppViewStore(s => s.setAppView);
  const activeView = useAppViewStore(s => s.appView);
  const input = useRef<HTMLInputElement>(null);
  const pendingSearch = useRef<{id:string;query:string} | null>(null);
  const results = useKnowledgeToolResults(state.query);

  useEffect(() => {
    const pending=pendingSearch.current;
    if(!pending || pending.query!==state.query || !ready || error) return;
    pendingSearch.current=null;
    void knowledgeRequest('/usage/search',{method:'POST',body:JSON.stringify({eventId:pending.id,query:pending.query,results:results.slice(0,500).map(card=>({id:card.id,kind:card.assetType==='skill'||card.assetType==='agent'?card.assetType:'tool',label:card.title,description:card.description,icon:card.icon}))})}).catch(()=>console.warn('MAX 搜索记录暂未保存'));
  },[state,results,ready,error]);

  return <div className="knowledge-chat knowledge-search"><main className="knowledge-main">
    <header className="knowledge-top"><BackButton label="返回平台" onClick={() => setView('home')}/><span className="knowledge-mode-label">搜工具</span></header>
    <div className="knowledge-search-scroll"><div className="knowledge-search-content">
      {activeView === 'ai-knowledge' && <MaxRobot className="knowledge-search-robot"/>}
      <KnowledgeModeTabs mode="search" onChange={onModeChange}/>
      <form className="knowledge-keyword-form" onSubmit={event => { event.preventDefault(); if (state.draft.trim()) { pendingSearch.current={id:crypto.randomUUID(),query:state.draft.trim()}; onChange({ ...state, query: state.draft.trim() }); } }}>
        <input ref={input} aria-label="搜索工具、Skill 或 Agent" placeholder="输入工具名称或关键词，搜索工具、Skill 或 Agent" value={state.draft} maxLength={200} onChange={event => onChange({ ...state, draft: event.target.value })}/>
        {state.draft && <button type="button" className="knowledge-keyword-clear" aria-label="清空搜索" onClick={() => { onChange({ draft: '', query: '' }); input.current?.focus(); }}>×</button>}
        <button type="submit" disabled={!state.draft.trim()}>搜索</button>
      </form>
      {(error || !ready || state.query) && <p className="knowledge-search-status" role="status">{error ? '平台资产暂时无法读取' : !ready ? '正在读取平台资产…' : results.length ? `找到 ${results.length} 个结果` : '没有匹配的工具或能力，试试其他关键词'}{error && <button type="button" onClick={() => void bootstrap()}>重试</button>}</p>}
      <div className="knowledge-search-grid">{results.map(card => <MarketShelfCard key={`${card.assetType || 'tool'}:${card.id}`} card={card} enableCompare={false} onOpen={() => openKnowledgeAsset(card.assetType === 'skill' || card.assetType === 'agent' ? card.assetType : 'tool', card.id)} onPrimary={() => openKnowledgeAsset(card.assetType === 'skill' || card.assetType === 'agent' ? card.assetType : 'tool', card.id)}/>)}</div>
    </div></div>
  </main></div>;
}
