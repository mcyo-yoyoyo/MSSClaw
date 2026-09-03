import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AI_KNOWLEDGE_CASE_LIBRARY_URL,
  AI_KNOWLEDGE_PROMPTS,
  applyClarification,
  buildSolution,
  canConfirmDemand,
  demandUserStory,
  demandFieldLabel,
  formatSolutionDate,
  saveAiKnowledgeSolution,
  startDemandDraft,
  updateDemandField,
  type AiKnowledgeSolution,
  type DemandDraft,
  type DemandFieldKey,
  type SolutionCaseInsight,
  type SolutionDiagnosis,
  type SolutionResource,
  type SolutionToolRecommendation,
} from '@/domain/aiKnowledge';
import {
  canUseAiKnowledgeApi,
  clarifyAiKnowledgeDraft,
  generateAiKnowledgeSolution,
  startAiKnowledgeDraft,
  updateAiKnowledgeDemand,
} from '@/api/aiKnowledgeApi';
import { writeAppRouteToLocation } from '@/domain/appRoute';
import {
  consumeAiKnowledgeEntry,
  consumeAiKnowledgeSolution,
  stageMeAiKnowledgeTab,
} from '@/domain/aiKnowledgeEntry';
import { openMarketToolDetail } from '@/domain/openHomeJourney';
import { CatalogAgentDetailModal } from '@/features/market/CatalogAgentDetailModal';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import { downloadBlob } from '@/lib/download';
import { cn } from '@/lib/utils';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import './aiKnowledge.css';

type ViewMode = 'home' | 'chat' | 'solution';

const DEMAND_FIELDS: DemandFieldKey[] = [
  'humanCheckpoint',
  'goal',
  'inputs',
  'aiRole',
];

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function solutionDiagnosis(solution: AiKnowledgeSolution): SolutionDiagnosis {
  return solution.diagnosis ?? {
    need: solution.target || solution.demand.goal,
    currentSituation: `${solution.demand.problem} 当前主要通过${solution.demand.currentMethod}处理。`,
    keyProblems: [solution.demand.problem],
    solutionDirection: solution.demand.aiRole,
  };
}

function conciseText(value: string, maxLength = 160): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  const firstSentence = clean.match(/^.+?[。！？.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= 24 && firstSentence.length <= maxLength) {
    return firstSentence;
  }
  return `${clean.slice(0, maxLength).replace(/[，,；;：:\s]+$/, '')}…`;
}

function normalizeResourceValue(value?: string): string {
  return (value ?? '').trim().replace(/\/+$/, '').toLocaleLowerCase();
}

function uniqueByResourceLabel<T extends { resource: SolutionResource }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.resource.kind}:${item.resource.label.trim().toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function solutionTools(solution: AiKnowledgeSolution): SolutionToolRecommendation[] {
  if (solution.toolRecommendations?.length) {
    return uniqueByResourceLabel(solution.toolRecommendations).slice(0, 3);
  }
  const seen = new Set<string>();
  const recommendations: SolutionToolRecommendation[] = [];
  solution.actions.forEach((action) => {
    action.resources?.filter((resource) => resource.kind !== 'case').forEach((resource) => {
      const key = resource.id ?? `${resource.kind}:${resource.label}`;
      if (seen.has(key)) return;
      seen.add(key);
      recommendations.push({
        id: `legacy-tool-${recommendations.length + 1}`,
        resource,
        problemSolved: action.title,
        introduction: resource.description || `${resource.label}是本方案引用的${resource.kind === 'tool' ? 'AI 工具' : resource.kind === 'skill' ? 'Skill 能力' : 'Agent 能力'}。`,
        howToUse: [action.input || '准备业务输入', `使用${resource.label}完成处理`, '由业务人员复核结果'],
        output: action.output,
        expectedEffect: '减少重复处理工作，并形成可复核的业务结果。',
      });
    });
  });
  return uniqueByResourceLabel(recommendations).slice(0, 3);
}

function solutionCases(solution: AiKnowledgeSolution): SolutionCaseInsight[] {
  if (Array.isArray(solution.caseInsights)) {
    return uniqueByResourceLabel(solution.caseInsights).slice(0, 2);
  }
  return uniqueByResourceLabel((solution.evidence ?? [])
    .filter((resource) => resource.kind === 'case')
    .map((resource, index) => ({
      id: `legacy-case-${index + 1}`,
      resource,
      similarProblem: resource.description || `案例与“${solution.demand.title}”存在相近问题。`,
      approach: resource.evidence || '案例通过引入 AI 能力优化原有业务流程。',
      result: '具体效果以案例原文披露为准。',
      lessons: ['先选择边界清晰的任务验证', '保留人工复核和原始证据'],
      applicability: '需要结合当前数据和流程判断可迁移范围。',
      toolsUsed: resource.toolsUsed?.length ? resource.toolsUsed : ['案例原文未明确说明'],
    }))).slice(0, 2);
}

function solutionDocument(solution: AiKnowledgeSolution): string {
  const diagnosis = solutionDiagnosis(solution);
  const tools = solutionTools(solution)
    .map(
      (item) => `
        <section class="item">
          <h3>${escapeHtml(item.resource.label)}</h3>
          <dl>
            <dt>为什么用</dt><dd>${escapeHtml(conciseText(item.problemSolved))}</dd>
            <dt>怎么使用</dt><dd>${item.howToUse.slice(0, 3).map((step) => escapeHtml(conciseText(step, 100))).join('；')}</dd>
            <dt>预期结果</dt><dd>${escapeHtml(conciseText(item.expectedEffect || item.output, 160))}</dd>
          </dl>
        </section>`,
    )
    .join('');
  const cases = solutionCases(solution).map((item) => `
    <section class="item"><h3>${escapeHtml(item.resource.label)}</h3><dl>
      <dt>案例做法</dt><dd>${escapeHtml(conciseText(item.approach))}</dd>
      <dt>使用工具</dt><dd>${escapeHtml((item.toolsUsed?.length ? item.toolsUsed : ['案例原文未明确说明']).join('、'))}</dd>
      <dt>可借鉴点</dt><dd><ul>${item.lessons.slice(0, 2).map((lesson) => `<li>${escapeHtml(conciseText(lesson, 100))}</li>`).join('')}</ul></dd>
      </dl></section>`).join('');
  const caseSection = cases
    ? `<section class="layer"><h2>03 参考案例</h2>${cases}</section>`
    : '';
  return `<!doctype html>
  <html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(solution.title)}</title>
  <style>body{font-family:"Microsoft YaHei",sans-serif;color:#18181b;max-width:820px;margin:48px auto;line-height:1.65}h1{font-size:26px;margin:0 0 8px}.meta{color:#71717a;font-size:13px;border-bottom:1px solid #e4e4e7;padding-bottom:20px}.layer{padding:26px 0;border-bottom:1px solid #e4e4e7}.layer>h2{font-size:18px;color:#1d4ed8}.item{padding:16px 0;border-top:1px solid #e4e4e7}.item h3{font-size:16px}dl{display:grid;grid-template-columns:88px 1fr;gap:7px 12px;margin:0}dt{color:#71717a}dd{margin:0}ol,ul{margin:0;padding-left:20px}</style>
  </head><body><h1>${escapeHtml(solution.title)}</h1><div class="meta">${escapeHtml(solution.domain)} · ${escapeHtml(solution.maturity)}${solution.generationSource ? ` · ${solution.generationSource === 'llm' ? `模型生成${solution.model ? `（${escapeHtml(solution.model)}）` : ''}` : '规则方案'}` : ''} · ${escapeHtml(formatSolutionDate(solution.createdAt))}</div><section class="layer"><h2>01 问题梳理</h2><p><strong>核心问题：</strong>${escapeHtml(conciseText(diagnosis.currentSituation, 220))}</p><p><strong>建议解法：</strong>${escapeHtml(conciseText(diagnosis.solutionDirection, 180))}</p></section><section class="layer"><h2>02 工具与使用路径</h2>${tools}</section>${caseSection}</body></html>`;
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function AiKnowledgePage() {
  const entryConsumed = useRef(false);
  const requestEpoch = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<ViewMode>('home');
  const [question, setQuestion] = useState('');
  const [inputError, setInputError] = useState('');
  const [draft, setDraft] = useState<DemandDraft | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [editingSummary, setEditingSummary] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [solution, setSolution] = useState<AiKnowledgeSolution | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [skillDetailId, setSkillDetailId] = useState<string | null>(null);
  const [agentDetailId, setAgentDetailId] = useState<string | null>(null);
  const setAppView = useAppViewStore((state) => state.setAppView);
  const setMarketSearch = useMarketFilterStore((state) => state.setSearch);
  const marketplaceTools = useMarketplaceStore((state) => state.tools);
  const marketplaceSkills = useMarketplaceStore((state) => state.skills);
  const marketplaceAgents = useMarketplaceStore((state) => state.agents);
  const skillDetail = marketplaceSkills.find((item) => item.id === skillDetailId) ?? null;
  const agentDetail = marketplaceAgents.find((item) => item.id === agentDetailId) ?? null;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const beginQuestion = async (value: string) => {
    const clean = value.trim();
    if (starting) return;
    if (clean.length < 2) {
      setInputError('请至少输入两个字，让智库了解你想解决的问题。');
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const epoch = ++requestEpoch.current;
    const localDraft = startDemandDraft(clean);
    setDraft(canUseAiKnowledgeApi()
      ? { ...localDraft, messages: localDraft.messages.filter((item) => item.role === 'user') }
      : localDraft);
    setSolution(null);
    setQuestion('');
    setInputError('');
    setInteractionError('');
    setPendingMessage('');
    setEditingSummary(false);
    setMobileWorkspaceOpen(false);
    setMode('chat');
    if (!canUseAiKnowledgeApi()) return;
    setStarting(true);
    try {
      const nextDraft = await startAiKnowledgeDraft(clean, controller.signal);
      if (requestEpoch.current !== epoch) return;
      setDraft(nextDraft);
    } catch {
      if (requestEpoch.current !== epoch) return;
      setInteractionError('需求分析没有完成，请重新发送。');
    } finally {
      if (requestEpoch.current === epoch) {
        activeRequest.current = null;
        setStarting(false);
      }
    }
  };

  useLayoutEffect(() => {
    if (entryConsumed.current) return;
    entryConsumed.current = true;
    const intent = consumeAiKnowledgeEntry();
    if (!intent) return;
    setQuestion(intent.question);
    void beginQuestion(intent.question);
  }, []);

  const sendClarification = async (retryMessage?: string) => {
    const message = (retryMessage ?? chatInput).trim();
    if (!draft || !message || sending || starting) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const epoch = ++requestEpoch.current;
    setSending(true);
    setPendingMessage(message);
    setInteractionError('');
    if (!retryMessage) setChatInput('');
    try {
      const next = canUseAiKnowledgeApi() && draft.id
        ? await clarifyAiKnowledgeDraft(draft.id, message, controller.signal)
        : applyClarification(draft, message);
      if (requestEpoch.current !== epoch) return;
      setDraft(next);
      setPendingMessage('');
    } catch {
      if (requestEpoch.current !== epoch) return;
      setInteractionError('补充信息没有发送成功，请重试。');
    } finally {
      if (requestEpoch.current === epoch) {
        activeRequest.current = null;
        setSending(false);
      }
    }
  };

  const generateSolution = async () => {
    if (!draft || !canConfirmDemand(draft.demand)) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const epoch = ++requestEpoch.current;
    setConfirmOpen(false);
    setGenerating(true);
    try {
      let current = draft;
      if (canUseAiKnowledgeApi() && draft.id) {
        current = await updateAiKnowledgeDemand(draft.id, draft.demand, controller.signal);
        if (requestEpoch.current !== epoch) return;
        setDraft(current);
      }
      const next = canUseAiKnowledgeApi() && current.id
        ? await generateAiKnowledgeSolution(current.id, controller.signal)
        : buildSolution(current);
      if (requestEpoch.current !== epoch) return;
      setSolution(next);
      if (!canUseAiKnowledgeApi()) saveAiKnowledgeSolution(next);
      setMode('solution');
    } catch (error) {
      if (requestEpoch.current !== epoch) return;
      const message = error instanceof Error && error.message.includes('llm_not_configured')
        ? '平台尚未配置方案生成模型'
        : error instanceof Error && error.message.includes('demand_incomplete')
          ? '需求摘要还没有完成，请继续补充待确认信息'
        : error instanceof Error && error.message.includes('invalid_solution')
          ? 'AI 生成的内容不完整，请重新生成'
          : '方案生成失败，请检查服务或稍后重试';
      setNotice(message);
    } finally {
      if (requestEpoch.current === epoch) {
        activeRequest.current = null;
        setGenerating(false);
      }
    }
  };

  const startNew = () => {
    requestEpoch.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setMode('home');
    setDraft(null);
    setSolution(null);
    setQuestion('');
    setChatInput('');
    setStarting(false);
    setSending(false);
    setPendingMessage('');
    setInteractionError('');
    setEditingSummary(false);
    setConfirmOpen(false);
    setExportOpen(false);
    setMobileWorkspaceOpen(false);
    setSkillDetailId(null);
    setAgentDetailId(null);
  };

  const openSavedSolution = (item: AiKnowledgeSolution) => {
    setSolution(item);
    setDraft({
      scenarioId: item.scenarioId,
      originalQuestion: item.originalQuestion,
      demand: item.demand,
      messages: item.messages,
      clarificationCount: Math.max(0, item.messages.filter((message) => message.role === 'user').length - 1),
    });
    setMode('solution');
  };

  useEffect(() => {
    const incoming = consumeAiKnowledgeSolution();
    if (!incoming) return;
    openSavedSolution(incoming);
  }, []);

  const openPersonalKnowledge = () => {
    stageMeAiKnowledgeTab();
    writeAppRouteToLocation({ view: 'me' });
    setAppView('me');
  };

  const openResource = (resource: SolutionResource) => {
    const resourceName = normalizeResourceValue(resource.label);
    const resourceUrl = normalizeResourceValue(resource.url);

    if (resource.kind === 'tool') {
      const tool = marketplaceTools.find((item) =>
        item.id === resource.id
        || normalizeResourceValue(item.name) === resourceName
        || (resourceUrl !== '' && [item.homepageUrl, item.docsUrl]
          .some((url) => normalizeResourceValue(url) === resourceUrl)),
      );

      if (tool) {
        openMarketToolDetail(tool.id);
        return;
      }

      setMarketSearch(resource.label);
      writeAppRouteToLocation({ view: 'market-external' });
      setAppView('market-external');
      return;
    }

    if (resource.kind === 'skill') {
      const skill = marketplaceSkills.find((item) =>
        item.id === resource.id
        || [item.name, item.nameZh, item.nameEn]
          .some((name) => normalizeResourceValue(name) === resourceName)
        || (resourceUrl !== '' && normalizeResourceValue(item.homepageUrl) === resourceUrl),
      );

      if (skill) {
        setSkillDetailId(skill.id);
        return;
      }
    }

    if (resource.kind === 'agent') {
      const agent = marketplaceAgents.find((item) =>
        item.id === resource.id
        || normalizeResourceValue(item.name) === resourceName
        || (resourceUrl !== '' && [item.demoUrl, item.solutionDocUrl]
          .some((url) => normalizeResourceValue(url) === resourceUrl)),
      );

      if (agent) {
        setAgentDetailId(agent.id);
        return;
      }
    }

    if (resource.url) {
      openExternal(resource.url);
      return;
    }
    setMarketSearch(resource.label);
    writeAppRouteToLocation({ view: 'market-projects' });
    setAppView('market-projects');
  };

  const exportWord = () => {
    if (!solution) return;
    downloadBlob(
      `${solution.title}.doc`,
      solutionDocument(solution),
      'application/msword;charset=utf-8',
    );
    setExportOpen(false);
    setNotice('Word方案已导出');
  };

  return (
    <div className="ak-shell">
      <div className="ak-toolbar">
        <div className="ak-toolbar__context">
          <button type="button" className="ak-toolbar__brand" onClick={startNew}>
            AI智库
          </button>
          {mode !== 'home' ? <span className="ak-toolbar__divider">/</span> : null}
          {mode === 'chat' ? <span>需求对话</span> : null}
          {mode === 'solution' ? <span>诊断方案</span> : null}
        </div>
        <div className="ak-toolbar__actions">
          <button type="button" className="ak-text-action" onClick={() => openExternal(AI_KNOWLEDGE_CASE_LIBRARY_URL)}>
            案例库 <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden />
          </button>
          {mode === 'solution' ? (
            <button type="button" className="ak-text-action" onClick={openPersonalKnowledge}>
              我的方案 <i className="fa-solid fa-arrow-right" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {mode === 'home' ? (
        <main className="ak-home">
          <section className="ak-home__intro">
            <p className="ak-home__eyebrow">MSS AI 智库</p>
            <h1>把业务问题变成下一步行动</h1>
            <p>基于真实案例、AI工具和内部能力</p>
          </section>

          <form
            className={cn('ak-composer ak-home__composer', inputError && 'has-error')}
            onSubmit={(event) => {
              event.preventDefault();
              beginQuestion(question);
            }}
          >
            <textarea
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                if (inputError) setInputError('');
              }}
              rows={3}
              placeholder="描述你现在怎么做、卡在哪里、希望得到什么结果……"
              aria-label="描述业务问题"
            />
            <button type="submit" disabled={starting || !question.trim()} className="ak-icon-primary" aria-label="发送问题" title="发送问题">
              <i className={cn('fa-solid', starting ? 'fa-circle-notch fa-spin' : 'fa-arrow-up')} aria-hidden />
            </button>
          </form>
          {inputError ? <p className="ak-field-error">{inputError}</p> : null}

          <section className="ak-home-section" aria-labelledby="ak-prompt-title">
            <h2 id="ak-prompt-title">可以从这些问题开始</h2>
            <div className="ak-prompt-list">
              {AI_KNOWLEDGE_PROMPTS.map((prompt) => (
                <button key={prompt} type="button" onClick={() => beginQuestion(prompt)}>
                  <span>{prompt}</span>
                  <i className="fa-solid fa-arrow-right" aria-hidden />
                </button>
              ))}
            </div>
          </section>

        </main>
      ) : null}

      {mode === 'chat' && !generating && draft ? (
        <main className={cn('ak-workbench', mobileWorkspaceOpen && 'is-mobile-workspace')}>
          <ConversationPane
            draft={draft}
            input={chatInput}
            onInput={setChatInput}
            onSend={() => void sendClarification()}
            onOpenWorkspace={() => setMobileWorkspaceOpen(true)}
            processing={starting || sending}
            processingLabel={starting ? '正在理解你的问题并整理需求摘要…' : '正在分析补充信息并更新需求摘要…'}
            pendingMessage={pendingMessage}
            error={interactionError}
            onRetry={starting || (!pendingMessage && interactionError)
              ? () => void beginQuestion(draft.originalQuestion)
              : pendingMessage ? () => void sendClarification(pendingMessage) : undefined}
          />
          <section className={cn('ak-summary-pane', (starting || sending) && 'is-analyzing')} aria-busy={starting || sending}>
            <div className="ak-pane-heading">
              <div><p>需求摘要</p><h1>{draft.demand.title}</h1></div>
              <div className="ak-pane-heading__end"><span>{starting || sending ? '正在分析并更新…' : canConfirmDemand(draft.demand) ? '需求卡已完成' : `还需确认 ${draft.demand.pendingKeys.length} 项`}</span><button type="button" className="ak-mobile-back" onClick={() => setMobileWorkspaceOpen(false)}><i className="fa-solid fa-arrow-left" />返回对话</button></div>
            </div>
            <div className="ak-demand-list">
              {DEMAND_FIELDS.map((key) => {
                const pending = draft.demand.pendingKeys.includes(key) || draft.demand[key] === '待确认';
                return (
                  <div key={key} className={cn('ak-demand-field', pending && 'is-pending')}>
                    <div className="ak-demand-field__head">
                      <span>{demandFieldLabel(key)}</span>
                      <span className="ak-status"><i aria-hidden />{pending ? '待确认' : '已确认'}</span>
                    </div>
                    {editingSummary ? (
                      <textarea
                        value={draft.demand[key] === '待确认' ? '' : draft.demand[key]}
                        rows={key === 'problem' || key === 'goal' ? 2 : 1}
                        onChange={(event) => setDraft(updateDemandField(draft, key, event.target.value))}
                        aria-label={`编辑${demandFieldLabel(key)}`}
                      />
                    ) : (
                      <p>{draft.demand[key]}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {canConfirmDemand(draft.demand) ? (
              <div className="ak-user-story">
                <span>用户故事</span>
                <p>{demandUserStory(draft.demand)}</p>
              </div>
            ) : null}
            <div className="ak-summary-actions">
              <button type="button" disabled={starting || sending} className="ak-button-secondary" onClick={() => setEditingSummary((value) => !value)}>
                <i className={cn('fa-solid', editingSummary ? 'fa-check' : 'fa-pen')} aria-hidden />
                {editingSummary ? '完成编辑' : '编辑摘要'}
              </button>
              <button
                type="button"
                className="ak-button-primary"
                disabled={starting || sending || !canConfirmDemand(draft.demand)}
                onClick={() => setConfirmOpen(true)}
              >
                确认需求，生成诊断
              </button>
            </div>
          </section>
        </main>
      ) : null}

      {(mode === 'solution' || generating) && (solution || draft) ? (
        <main className="ak-workbench ak-workbench--solution">
          <ConversationPane draft={draft!} readOnly />
          <section className="ak-solution-pane">
            {generating ? (
              <div className="ak-generating"><i className="fa-solid fa-circle-notch fa-spin" /><span>正在检索工具与案例并生成诊断……</span></div>
            ) : solution ? (
              <SolutionView
                solution={solution}
                exportOpen={exportOpen}
                onToggleExport={() => setExportOpen((value) => !value)}
                onExportWord={exportWord}
                onExportPdf={() => {
                  setExportOpen(false);
                  window.print();
                }}
                onResource={openResource}
                onNew={startNew}
              />
            ) : null}
          </section>
        </main>
      ) : null}

      {confirmOpen ? (
        <div className="ak-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false); }}>
          <section className="ak-confirm" role="dialog" aria-modal="true" aria-labelledby="ak-confirm-title">
            <div className="ak-confirm__icon"><i className="fa-solid fa-check" /></div>
            <h2 id="ak-confirm-title">确认生成诊断方案</h2>
            <p>将根据已确认需求检索平台工具、内部能力和相关案例，生成三层诊断结果。</p>
            <div><button type="button" className="ak-button-secondary" onClick={() => setConfirmOpen(false)}>返回检查</button><button type="button" className="ak-button-primary" onClick={generateSolution}>确认生成</button></div>
          </section>
        </div>
      ) : null}

      {skillDetail ? (
        <MarketSkillDetailModal
          skill={skillDetail}
          canRun={false}
          onClose={() => setSkillDetailId(null)}
          onRun={() => undefined}
          onToast={setNotice}
        />
      ) : null}

      {agentDetail ? (
        <CatalogAgentDetailModal
          agent={agentDetail}
          canRun={false}
          onClose={() => setAgentDetailId(null)}
          onRun={() => undefined}
          onToast={setNotice}
        />
      ) : null}

      {notice ? <div className="ak-notice" role="status">{notice}</div> : null}
    </div>
  );
}

function ConversationPane({
  draft,
  input = '',
  onInput,
  onSend,
  readOnly = false,
  onOpenWorkspace,
  processing = false,
  processingLabel = '',
  pendingMessage = '',
  error = '',
  onRetry,
}: {
  draft: DemandDraft;
  input?: string;
  onInput?: (value: string) => void;
  onSend?: () => void;
  readOnly?: boolean;
  onOpenWorkspace?: () => void;
  processing?: boolean;
  processingLabel?: string;
  pendingMessage?: string;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="ak-conversation-pane">
      <div className="ak-pane-heading"><div><p>需求对话</p><h1>{draft.demand.title}</h1></div>{readOnly ? <span>只读</span> : null}</div>
      <div className="ak-message-list">
        {draft.messages.map((item) => (
          <article key={item.id} className={cn('ak-message', item.role === 'assistant' && 'is-assistant')}>
            <span>{item.role === 'user' ? '你' : 'AI智库'}</span>
            <p>{item.text}</p>
          </article>
        ))}
        {pendingMessage ? (
          <article className="ak-message is-pending-user">
            <span>你</span><p>{pendingMessage}</p>
          </article>
        ) : null}
        {processing ? (
          <article className="ak-message is-assistant is-processing" role="status" aria-live="polite">
            <span>AI智库</span><div className="ak-processing-line"><i className="fa-solid fa-circle-notch fa-spin" /><p>{processingLabel}</p></div>
          </article>
        ) : null}
        {error && !processing ? (
          <article className="ak-message is-assistant is-error" role="alert">
            <span>AI智库</span><div className="ak-processing-line"><i className="fa-solid fa-circle-exclamation" /><p>{error}</p>{onRetry ? <button type="button" onClick={onRetry}>重新发送</button> : null}</div>
          </article>
        ) : null}
      </div>
      {readOnly ? (
        <div className="ak-readonly-note"><i className="fa-solid fa-lock" />需求已确认，本轮对话已结束</div>
      ) : (
        <>{canConfirmDemand(draft.demand) ? <div className="ak-demand-ready" role="status"><i className="fa-solid fa-check" /><div><strong>需求卡已完成</strong><span>请确认需求卡后生成方案。</span></div><button type="button" onClick={onOpenWorkspace}>查看需求卡</button></div> : null}<button type="button" className="ak-mobile-workspace-button" onClick={onOpenWorkspace}><i className="fa-regular fa-rectangle-list" />查看需求卡</button><form className={cn('ak-chat-composer', processing && 'is-processing')} onSubmit={(event) => { event.preventDefault(); onSend?.(); }}>
          <textarea disabled={processing} value={input} onChange={(event) => onInput?.(event.target.value)} rows={2} placeholder={processing ? '正在处理当前消息…' : canConfirmDemand(draft.demand) ? '可选：继续补充需求细节…' : '继续补充需求卡中的待确认信息……'} aria-label="补充需求信息" />
          <button type="submit" disabled={processing || !input.trim()} className="ak-icon-primary" aria-label="发送补充信息" title="发送补充信息"><i className={cn('fa-solid', processing ? 'fa-circle-notch fa-spin' : 'fa-arrow-up')} /></button>
        </form></>
      )}
    </section>
  );
}

function SolutionView({
  solution,
  exportOpen,
  onToggleExport,
  onExportWord,
  onExportPdf,
  onResource,
  onNew,
}: {
  solution: AiKnowledgeSolution;
  exportOpen: boolean;
  onToggleExport: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  onResource: (resource: SolutionResource) => void;
  onNew: () => void;
}) {
  const diagnosis = solutionDiagnosis(solution);
  const recommendations = solutionTools(solution);
  const cases = solutionCases(solution);
  return (
    <div className="ak-solution">
      <header className="ak-solution__header">
        <div><div className="ak-solution__meta"><span>{solution.domain}</span><span>{solution.maturity}</span>{solution.generationSource ? <span>{solution.generationSource === 'llm' ? `模型生成${solution.model ? ` · ${solution.model}` : ''}` : '规则方案'}</span> : null}<time>{formatSolutionDate(solution.createdAt)}</time></div><h1>{solution.title}</h1></div>
        <div className="ak-export"><button type="button" className="ak-button-secondary" onClick={onToggleExport}><i className="fa-solid fa-download" />导出方案<i className="fa-solid fa-chevron-down" /></button>{exportOpen ? <div className="ak-export__menu"><button type="button" onClick={onExportWord}><i className="fa-regular fa-file-word" />Word文档</button><button type="button" onClick={onExportPdf}><i className="fa-regular fa-file-pdf" />打印/保存PDF</button></div> : null}</div>
      </header>
      <section className="ak-diagnostic-layer">
        <div className="ak-layer-heading"><span>01</span><div><p>问题梳理</p><h2>问题是什么，建议怎么解决</h2></div></div>
        <div className="ak-concise-diagnosis">
          <div><span>核心问题</span><p>{conciseText(diagnosis.currentSituation, 220)}</p></div>
          <div><span>建议解法</span><p>{conciseText(diagnosis.solutionDirection, 180)}</p></div>
        </div>
      </section>

      <section className="ak-diagnostic-layer">
        <div className="ak-layer-heading"><span>02</span><div><p>工具与使用路径</p><h2>用什么，按什么路径使用</h2></div></div>
        {recommendations.length ? <div className="ak-tool-list">{recommendations.map((item, index) => (
          <article key={item.id} className="ak-tool-recommendation">
            <header><div><span>{String(index + 1).padStart(2, '0')}</span><div><small>{item.resource.kind === 'tool' ? 'AI工具' : item.resource.kind === 'skill' ? 'Skill' : 'Agent'}</small><h3>{item.resource.label}</h3></div></div><button type="button" onClick={() => onResource(item.resource)}>查看能力 <i className="fa-solid fa-arrow-right" /></button></header>
            <dl><dt>针对你的需求</dt><dd>{conciseText(item.problemSolved)}</dd><dt>怎么使用</dt><dd><div className="ak-tool-path">{item.howToUse.slice(0, 3).map((step, stepIndex) => <span key={`${stepIndex}-${step}`}>{conciseText(step, 100)}</span>)}</div></dd><dt>预期结果</dt><dd>{conciseText(item.expectedEffect || item.output, 160)}</dd></dl>
          </article>
        ))}</div> : <p className="ak-layer-empty">暂未匹配到可说明的内部工具或能力。</p>}
      </section>

      {cases.length ? <section className="ak-diagnostic-layer">
        <div className="ak-layer-heading"><span>03</span><div><p>参考案例</p><h2>别人怎么做，有什么可借鉴</h2></div></div>
        <div className="ak-case-list">{cases.map((item) => (
          <article key={item.id} className="ak-case-insight">
            <header><div><small>AI落地案例</small><h3>{item.resource.label}</h3></div><button type="button" onClick={() => onResource(item.resource)}>查看完整案例 <i className="fa-solid fa-arrow-up-right-from-square" /></button></header>
            <dl><dt>别人做了什么</dt><dd>{conciseText(item.approach)}</dd><dt>使用工具</dt><dd>{item.toolsUsed?.length ? item.toolsUsed.join('、') : '案例原文未明确说明'}</dd><dt>我们的借鉴</dt><dd><ul>{item.lessons.slice(0, 2).map((lesson) => <li key={lesson}>{conciseText(lesson, 120)}</li>)}</ul></dd></dl>
          </article>
        ))}</div>
      </section> : null}
      <div className="ak-solution__footer"><button type="button" className="ak-button-secondary" onClick={onNew}><i className="fa-solid fa-plus" />发起新问题</button></div>
    </div>
  );
}
