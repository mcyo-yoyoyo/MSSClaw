import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { CenterModal } from '@/components/center/CenterShell';
import { ProjectDocsGallery } from '@/components/content/ProjectDocsGallery';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';
import type { ScenarioBundle } from '@/domain/portalMap';
import {
  getScenarioEnv,
  isScenarioEnvFilled,
  type ScenarioEnv,
} from '@/domain/scenarioEnv';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';
import { ARCHITECTURE_DOC_KIND_LABELS } from '@/domain/scenarioArchitecture';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';

type DetailTab = 'overview' | 'materials' | 'env' | 'reviews';

/** MVP：评价模块暂不上线，Tab 保留占位。 */
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

function ComposeList({
  title,
  cards,
}: {
  title: string;
  cards: { id: string; title: string; desc: string; icon: string; kindLabel: string }[];
}) {
  if (!cards.length) return null;
  return (
    <section>
      <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">
        {title}
        <span className="ml-1.5 font-normal text-zinc-400">{cards.length}</span>
      </h4>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li
            key={c.id}
            className="flex items-start gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 ring-1 ring-black/[0.04]">
              <i className={cn('fa-solid text-[11px]', c.icon || 'fa-cube')} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[12px] font-semibold text-zinc-800">{c.title}</p>
                <span className="rounded bg-zinc-100 px-1 py-px text-[9px] font-medium text-zinc-400">
                  {c.kindLabel}
                </span>
              </div>
              {c.desc ? (
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                  {c.desc}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EnvBlock({ env }: { env: ScenarioEnv }) {
  return (
    <dl className="divide-y divide-zinc-50 rounded-xl border border-zinc-100 bg-white px-3 py-1">
      <MetaRow label="硬件" value={env.hardware?.trim() || undefined} />
      {env.codingTools?.length ? (
        <div className="py-1.5">
          <dt className="text-[11px] text-zinc-400">AI Coding / IDE</dt>
          <dd className="mt-1 space-y-1">
            {env.codingTools.map((t) => (
              <p key={t.name} className="text-[12px] text-zinc-700">
                {t.name}
                {t.note ? <span className="text-zinc-400"> · {t.note}</span> : null}
              </p>
            ))}
          </dd>
        </div>
      ) : null}
      {env.cloudModels?.length || env.localModels?.length ? (
        <div className="py-1.5">
          <dt className="text-[11px] text-zinc-400">模型参照</dt>
          <dd className="mt-1 space-y-1">
            {[...(env.cloudModels ?? []), ...(env.localModels ?? [])].map((m) => (
              <p key={`${m.kind}-${m.name}`} className="text-[12px] text-zinc-700">
                {m.name}
                <span className="text-zinc-400">
                  {' '}
                  · {m.kind === 'cloud' ? '云端' : '本地'}
                  {m.note ? ` · ${m.note}` : ''}
                </span>
              </p>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export function MarketAgentDetailModal({
  scenarioId,
  title,
  description,
  icon,
  badges,
  bundle,
  items,
  canRun,
  demoPlan,
  onClose,
  onDownload,
  onRun,
  onToast,
}: {
  scenarioId: string;
  title: string;
  description: string;
  icon: string;
  badges: { label: string; tone?: 'dept' | 'region' | 'type' }[];
  bundle: ScenarioBundle | null;
  items: PortalContentItem[];
  canRun: boolean;
  demoPlan: ScenarioDemoPlan | null;
  onClose: () => void;
  onDownload: () => void;
  onRun: () => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [focusItemId, setFocusItemId] = useState<string | undefined>(items[0]?.id);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const getVote = useContentEngagementStore((s) => s.userVote);
  void engagementById;
  const eng = getEngagement(scenarioId);
  const vote = getVote(scenarioId);

  const env = useMemo(
    () => bundle?.env ?? getScenarioEnv(scenarioId) ?? null,
    [bundle, scenarioId],
  );
  const envFilled = isScenarioEnvFilled(env);

  const stepItems = useMemo(
    () => items.filter((i) => (i.steps?.length ?? 0) > 0),
    [items],
  );

  const runnable = canRun && Boolean(demoPlan);
  const agentCount = bundle?.agents.length ?? 0;
  const skillCount = bundle?.skills.length ?? 0;
  const toolCount = bundle?.tools.length ?? 0;
  const archCount = bundle?.architectureDocs.length ?? 0;

  /** 材料：全宽；概览 / 环境 / 评价：保留侧栏 */
  const showAside = tab === 'overview' || tab === 'env' || tab === 'reviews';

  const tabs: { id: DetailTab; label: string; badge?: string }[] = [
    { id: 'overview', label: '概览' },
    { id: 'materials', label: '快速上手' },
    { id: 'env', label: '环境' },
    {
      id: 'reviews',
      label: '评价',
      badge: AGENT_REVIEWS_MVP_ENABLED ? undefined : '即将开放',
    },
  ];

  const handleDownload = () => {
    onDownload();
  };

  const handleRun = () => {
    if (!runnable) {
      onToast('当前暂不可执行，请先下载学习');
      return;
    }
    onRun();
  };

  return (
    <CenterModal
      open
      title={title}
      onClose={onClose}
      size="2xl"
      header={
        <div className="shrink-0 border-b border-zinc-100 bg-white px-5 py-3.5 md:px-6">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-black/[0.04]">
              <ToolLogo name={title} icon={icon || 'fa-map'} size={36} className="rounded-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[17px] font-semibold tracking-tight text-zinc-900">
                      {title}
                    </h3>
                    {runnable ? (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        可执行
                      </span>
                    ) : (
                      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                        学习包
                      </span>
                    )}
                  </div>
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
                {description || '暂无描述'}
              </p>
              {badges.length ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {badges.map((b) => (
                    <span
                      key={`${b.tone}-${b.label}`}
                      className={cn(
                        'rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600',
                        b.tone === 'dept' && 'bg-violet-50 text-violet-800',
                        b.tone === 'region' && 'bg-teal-50 text-teal-800',
                        b.tone === 'type' && 'bg-amber-50 text-amber-800',
                      )}
                    >
                      {b.label}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-500">
                <span>↓ {formatToolInvokes(eng.downloads)}</span>
                <span className="text-zinc-300">·</span>
                <span>
                  赞 {formatToolInvokes(eng.likes)} / 踩 {formatToolInvokes(eng.dislikes)}
                </span>
                <span className="text-zinc-300">·</span>
                <span>
                  {agentCount} Agent · {skillCount} Skill · {toolCount} 工具
                </span>
                <span className="text-zinc-300">·</span>
                <span>{items.length} 份材料</span>
                {envFilled ? (
                  <>
                    <span className="text-zinc-300">·</span>
                    <span>含环境清单</span>
                  </>
                ) : null}
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
              onClick={() => toggleLike(scenarioId)}
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
              onClick={() => toggleDislike(scenarioId)}
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03]"
            >
              关闭
            </button>
            {runnable ? (
              <button
                type="button"
                onClick={handleRun}
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
              <i className="fa-solid fa-download text-[11px]" />
              下载
            </button>
          </div>
        </div>
      }
    >
      <div
        className={cn(
          'grid min-h-[480px]',
          showAside && 'md:grid-cols-[minmax(0,1.85fr)_minmax(220px,0.7fr)]',
        )}
      >
        <div
          className={cn(
            'flex min-h-0 flex-col border-zinc-100',
            showAside && 'md:border-r',
          )}
        >
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-100 px-4 pt-3 md:px-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[12px] font-semibold transition',
                  tab === t.id
                    ? 'bg-white text-zinc-900 shadow-[inset_0_-2px_0_0_#18181b]'
                    : 'text-zinc-400 hover:text-zinc-700',
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

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5',
              tab === 'materials' && 'md:px-6',
            )}
          >
            {tab === 'overview' ? (
              <div className="space-y-5">
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">场景价值</h4>
                  <p className="text-[13px] leading-relaxed text-zinc-600">
                    {description || '暂无描述'}
                  </p>
                </section>
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">能力边界</h4>
                  <ul className="list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed text-zinc-600">
                    <li>学习包可下载本地预览；平台内执行依赖当前部署与打样链路。</li>
                    <li>组成内的 Agent / Skill / 工具以场景绑定为准，可能随运营更新。</li>
                    <li>准备层环境为体外参照清单，1.0 不由平台代配。</li>
                  </ul>
                </section>
                {demoPlan ? (
                  <section>
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">
                      默认执行计划
                      <span className="ml-2 font-normal text-zinc-400">
                        {demoPlan.mode === 'team' ? '专家团' : '单点'}
                      </span>
                    </h4>
                    {demoPlan.mode === 'team' && demoPlan.steps.length ? (
                      <ol className="space-y-2">
                        {demoPlan.steps.map((step, i) => (
                          <li
                            key={`${step.agentId}-${i}`}
                            className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-zinc-800">{step.label}</p>
                              {step.blurb ? (
                                <p className="mt-0.5 text-[11px] text-zinc-500">{step.blurb}</p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5 text-[12px] text-zinc-700">
                        {demoPlan.label}
                        {demoPlan.soloSkill
                          ? ` · Skill「${demoPlan.soloSkill.name}」`
                          : demoPlan.soloAgent
                            ? ` · Agent「${demoPlan.soloAgent.name}」`
                            : ''}
                      </p>
                    )}
                  </section>
                ) : (
                  <section className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-5 text-center text-[12px] text-zinc-400">
                    暂无平台内打样链路，可下载学习包本地预览。
                  </section>
                )}
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">组成</h4>
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: 'Agent', n: agentCount },
                      { label: 'Skill', n: skillCount },
                      { label: '工具', n: toolCount },
                      { label: '架构文档', n: archCount },
                    ].map((x) => (
                      <div
                        key={x.label}
                        className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-center"
                      >
                        <p className="text-[16px] font-semibold tabular-nums text-zinc-900">{x.n}</p>
                        <p className="text-[10px] text-zinc-400">{x.label}</p>
                      </div>
                    ))}
                  </div>
                  {bundle &&
                  (bundle.agents.length ||
                    bundle.skills.length ||
                    bundle.tools.length ||
                    bundle.architectureDocs.length) ? (
                    <div className="space-y-4">
                      <ComposeList title="Agent" cards={bundle.agents} />
                      <ComposeList title="Skill" cards={bundle.skills} />
                      <ComposeList title="工具 / 连接器" cards={bundle.tools} />
                      {bundle.architectureDocs.length ? (
                        <section>
                          <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">
                            架构 / 方案
                            <span className="ml-1.5 font-normal text-zinc-400">
                              {bundle.architectureDocs.length}
                            </span>
                          </h4>
                          <ul className="space-y-2">
                            {bundle.architectureDocs.map((d) => (
                              <li
                                key={d.id}
                                className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="text-[12px] font-semibold text-zinc-800">{d.title}</p>
                                  <span className="rounded bg-zinc-100 px-1 py-px text-[9px] font-medium text-zinc-400">
                                    {ARCHITECTURE_DOC_KIND_LABELS[d.kind]}
                                  </span>
                                </div>
                                {d.markdown ? (
                                  <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                                    {d.markdown.replace(/^#+\s*/gm, '').slice(0, 120)}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-5 text-center text-[12px] text-zinc-400">
                      暂无绑定组成。可在门户运营中挂载 Agent / Skill / 工具。
                    </p>
                  )}
                </section>
              </div>
            ) : null}

            {tab === 'materials' ? (
              <div className="space-y-4">
                {items.length ? (
                  <>
                    <ProjectDocsGallery
                      key={focusItemId || 'gallery'}
                      items={items}
                      initialItemId={focusItemId || items[0]?.id}
                      stageAspect="widescreen"
                      className="w-full"
                    />
                    {items.length > 1 ? (
                      <details className="rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5" open={false}>
                        <summary className="cursor-pointer text-[12px] font-semibold text-zinc-800">
                          全部材料
                          <span className="ml-1.5 font-normal text-zinc-400">{items.length}</span>
                        </summary>
                        <ul className="mt-2.5 space-y-1.5">
                          {items.map((item) => {
                            const typeLabel =
                              PORTAL_CONTENT_TYPE_LABELS[item.type] ?? item.type;
                            const active = item.id === focusItemId;
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => setFocusItemId(item.id)}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] transition',
                                    active
                                      ? 'bg-zinc-900 text-white'
                                      : 'text-zinc-700 hover:bg-zinc-50',
                                  )}
                                >
                                  <span className="min-w-0 flex-1 truncate font-medium">
                                    {item.title}
                                  </span>
                                  <span
                                    className={cn(
                                      'shrink-0 text-[10px]',
                                      active ? 'text-zinc-300' : 'text-zinc-400',
                                    )}
                                  >
                                    {typeLabel}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    ) : null}
                    {stepItems.length ? (
                      <section className="rounded-xl border border-zinc-100 bg-zinc-50/70 px-3.5 py-3">
                        <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">上手步骤</h4>
                        <div className="space-y-3">
                          {stepItems.map((item) => (
                            <div key={`steps-${item.id}`}>
                              <p className="text-[11px] font-medium text-zinc-500">{item.title}</p>
                              <ol className="mt-1 list-decimal space-y-1 pl-4 text-[12px] leading-relaxed text-zinc-600">
                                {item.steps!.map((s, i) => (
                                  <li key={`${item.id}-s-${i}`}>{s}</li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
                    暂无案例与上手材料。可在门户运营维护场景文档。
                  </div>
                )}
              </div>
            ) : null}

            {tab === 'env' ? (
              <div className="space-y-4">
                {env && envFilled ? (
                  <>
                    <p className="text-[12px] leading-relaxed text-zinc-500">
                      准备层为体外参照清单：自行配置设备 / 工具 / 模型后再开干。平台内执行请用底部「执行」。
                    </p>
                    <EnvBlock env={env} />
                    {bundle?.envTools?.length ? (
                      <ComposeList title="相关外部工具（参照）" cards={bundle.envTools} />
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
                    本场景暂未配置准备环境清单。
                  </div>
                )}
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

        {showAside ? (
          <aside className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 md:border-t-0 md:px-5">
            {tab === 'overview' || tab === 'env' ? (
              <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3">
                <p className="mb-2 text-[11px] font-semibold text-zinc-500">运行摘要</p>
                <dl className="divide-y divide-zinc-50">
                  <MetaRow
                    label="执行"
                    value={
                      runnable
                        ? demoPlan?.mode === 'team'
                          ? '专家团打样'
                          : '单点打样'
                        : '仅下载学习'
                    }
                  />
                  <MetaRow label="材料" value={`${items.length} 条`} />
                  <MetaRow label="环境清单" value={envFilled ? '已配置' : '未配置'} />
                  {bundle ? (
                    <MetaRow label="齐套" value={`${bundle.completeness}/3 层`} />
                  ) : null}
                </dl>
              </div>
            ) : null}

            <dl className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 divide-y divide-zinc-50">
              <MetaRow label="场景 ID" value={scenarioId} />
              {bundle?.ownerDeptIds?.[0] ? (
                <MetaRow label="领域数" value={String(bundle.ownerDeptIds.length)} />
              ) : null}
              {!runnable ? (
                <div className="py-2 text-[11px] leading-relaxed text-zinc-400">
                  当前方案仅支持下载学习；有打样链路后可在底部「执行」。
                </div>
              ) : null}
            </dl>
          </aside>
        ) : null}
      </div>
    </CenterModal>
  );
}
