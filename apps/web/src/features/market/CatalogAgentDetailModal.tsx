import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { CenterModal } from '@/components/center/CenterShell';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import { getAgentBusinessLabel } from '@/domain/agentBusinessScenarios';
import { getAgentPack } from '@/domain/agents/catalog';
import { buildAgentDemoPrompt, getPrimarySkill } from '@/domain/agents/runtime';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { downloadAgentFile } from '@/domain/agentExport';
import { skillDisplayName } from '@/domain/skillDisplay';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type DetailTab = 'overview' | 'guide' | 'env' | 'reviews';

/** MVP：评价模块暂不上线，与集市 Agent 详情一致。 */
const AGENT_REVIEWS_MVP_ENABLED = false;

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] text-zinc-400">{label}</dt>
      <dd className="text-right text-[12px] font-medium text-zinc-700">{value}</dd>
    </div>
  );
}

/**
 * 配置 Agent / 集市同构的目录 Agent 详情弹层（与用户视角 Market* 详情风格对齐）。
 */
export function CatalogAgentDetailModal({
  agent,
  canRun,
  onClose,
  onRun,
  onToast,
  adminActions,
}: {
  agent: PrototypeAgentSeed;
  canRun: boolean;
  onClose: () => void;
  onRun: (agent: PrototypeAgentSeed) => void;
  onToast: (msg: string) => void;
  adminActions?: {
    onEdit: () => void;
  };
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const skills = useMarketplaceStore((s) => s.skills);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const getVote = useContentEngagementStore((s) => s.userVote);
  void engagementById;
  const eng = getEngagement(agent.id);
  const vote = getVote(agent.id);

  const pack = useMemo(() => getAgentPack(agent.id), [agent.id]);
  const persona = (agent.systemPrompt || pack?.systemPrompt || '').trim();
  const planSteps = agent.planSteps?.length ? agent.planSteps : pack?.planSteps ?? [];
  const demoPrompt = (agent.demoPrompt || buildAgentDemoPrompt(agent)).trim();
  const bizLabel = getAgentBusinessLabel(agent);
  const deptLabel = agent.ownerDeptIds?.[0] ? getDeptLabel(agent.ownerDeptIds[0]) : '';
  const regionLabel = agent.ownerRegionIds?.[0] ? getRegionLabel(agent.ownerRegionIds[0]) : '';
  const scopeLabel = ASSET_VISIBILITY_LABELS[agent.visibility ?? 'public'];
  const primaryId = agent.primarySkillId || getPrimarySkill(agent)?.id;

  const skillName = (id: string) => {
    const hit = skills.find((s) => s.id === id) ?? PROTOTYPE_SKILLS.find((s) => s.id === id);
    return hit ? skillDisplayName(hit) : id;
  };

  const handleDownload = () => {
    bumpDownload(agent.id);
    downloadAgentFile(agent);
    onToast(`已下载：${agent.name}`);
  };

  const tabs: { id: DetailTab; label: string; badge?: string }[] = [
    { id: 'overview', label: '概览' },
    { id: 'guide', label: '快速上手' },
    { id: 'env', label: '环境' },
    {
      id: 'reviews',
      label: '评价',
      badge: AGENT_REVIEWS_MVP_ENABLED ? undefined : '即将开放',
    },
  ];

  return (
    <CenterModal
      open
      title={agent.name}
      onClose={onClose}
      size="2xl"
      header={
        <div className="shrink-0 border-b border-zinc-100 bg-white px-5 py-3.5 md:px-6">
          <div className="flex items-start gap-3.5">
            <AgentPortrait
              agentId={agent.id}
              name={agent.name}
              icon={agent.icon}
              avatarUrl={agent.avatarUrl}
              avatarPresetId={agent.avatarPresetId}
              size={48}
              className="shrink-0 rounded-xl"
              title={agent.name}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[17px] font-semibold tracking-tight text-zinc-900">
                      {agent.name}
                    </h3>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        (agent.visibility ?? 'public') === 'public'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-sky-50 text-sky-800',
                      )}
                    >
                      {scopeLabel}
                    </span>
                    {agent.published ? (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                        已上架
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        未上架
                      </span>
                    )}
                  </div>
                  {agent.bizLine ? (
                    <p className="mt-0.5 truncate text-[12px] text-zinc-400">{agent.bizLine}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="关闭"
                >
                  <i className="fa-solid fa-xmark text-[14px]" />
                </button>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-zinc-600">
                {agent.desc || '暂无描述'}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {deptLabel ? (
                  <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                    {deptLabel}
                  </span>
                ) : null}
                {regionLabel ? (
                  <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                    {regionLabel}
                  </span>
                ) : null}
                {bizLabel ? (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                    {bizLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-500">
                <span>{formatToolInvokes(agent.invokes)} 次调用</span>
                <span className="text-zinc-300">·</span>
                <span>↓ {formatToolInvokes(eng.downloads)}</span>
                <span className="text-zinc-300">·</span>
                <span>
                  赞 {formatToolInvokes(eng.likes)} / 踩 {formatToolInvokes(eng.dislikes)}
                </span>
                <span className="text-zinc-300">·</span>
                <span>{getEfficiencyLabel(agent.category)}</span>
              </div>
            </div>
          </div>
        </div>
      }
      actions={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleLike(agent.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                vote === 'like'
                  ? 'bg-sky-50 text-sky-800'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <i className="fa-solid fa-thumbs-up text-[10px]" />
              {formatToolInvokes(eng.likes)}
            </button>
            <button
              type="button"
              onClick={() => toggleDislike(agent.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                vote === 'dislike'
                  ? 'bg-zinc-100 text-zinc-800'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <i className="fa-solid fa-thumbs-down text-[10px]" />
              {formatToolInvokes(eng.dislikes)}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03]"
            >
              关闭
            </button>
            {adminActions ? (
              <button
                type="button"
                onClick={adminActions.onEdit}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-black/[0.03]"
              >
                编辑
              </button>
            ) : null}
            {canRun ? (
              <button
                type="button"
                onClick={() => onRun(agent)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <i className="fa-solid fa-play text-[10px]" />
                执行
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
            >
              <i className="fa-solid fa-download text-[10px]" />
              下载
            </button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-100 px-4 pt-2 md:px-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[12px] font-semibold transition',
                  tab === t.id
                    ? 'bg-white text-zinc-900 shadow-[0_-1px_0_#fff,0_1px_0_#e4e4e7]'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {t.label}
                {t.badge ? (
                  <span className="rounded bg-zinc-100 px-1 py-px text-[9px] font-medium text-zinc-400">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
            {tab === 'overview' ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="space-y-4">
                  {persona ? (
                    <section className="rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
                      <h4 className="mb-2 text-[12px] font-semibold text-sky-900">Persona</h4>
                      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-700">
                        {persona}
                      </pre>
                    </section>
                  ) : null}
                  <section className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3.5">
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">挂载 Skills</h4>
                    {agent.skillIds.length ? (
                      <ul className="space-y-1.5">
                        {agent.skillIds.map((id) => (
                          <li
                            key={id}
                            className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[12px] text-zinc-700 ring-1 ring-zinc-100"
                          >
                            <i className="fa-solid fa-cube text-[10px] text-zinc-400" />
                            <span className="min-w-0 flex-1 truncate">{skillName(id)}</span>
                            {primaryId === id ? (
                              <span className="text-[10px] font-semibold text-sky-700">主</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-zinc-400">暂未挂载 Skill</p>
                    )}
                  </section>
                </div>
                <aside className="space-y-3">
                  <dl className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 divide-y divide-zinc-50">
                    <MetaRow label="作者" value={agent.author} />
                    <MetaRow label="发布方" value={agent.publisher || agent.author} />
                    <MetaRow label="场景" value={bizLabel || '未分类'} />
                    <MetaRow label="业务线" value={agent.bizLine} />
                  </dl>
                </aside>
              </div>
            ) : null}

            {tab === 'guide' ? (
              <div className="space-y-4">
                {planSteps.length ? (
                  <section className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-3">
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">编排计划</h4>
                    <ol className="list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-zinc-600">
                      {planSteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}
                {demoPrompt ? (
                  <section className="rounded-xl border border-dashed border-zinc-200 bg-white p-3.5">
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">演示任务</h4>
                    <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-600">
                      {demoPrompt}
                    </pre>
                  </section>
                ) : null}
                {!planSteps.length && !demoPrompt ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
                    暂无快速上手材料。可在编辑页补充编排计划与演示任务。
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === 'env' ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
                本 Agent 暂无体外环境清单。执行依赖工作区模型配置与已挂载 Skill。
              </div>
            ) : null}

            {tab === 'reviews' ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <i className="fa-solid fa-comment-dots text-[18px]" />
                </span>
                <p className="text-[14px] font-semibold text-zinc-800">评价功能即将开放</p>
                <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-zinc-500">
                  当前 MVP 暂不提供评分与留言；上线后可在此查看均分与使用反馈。
                </p>
                <span className="mt-3 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  MVP · 暂不上线
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </CenterModal>
  );
}
