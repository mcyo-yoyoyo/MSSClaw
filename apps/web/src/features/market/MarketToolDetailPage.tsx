import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import {
  HowToDrawer,
  HowToGuidePreviewModal,
  openGuideEntry,
} from '@/components/market/HowToPanel';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { resolveToolBusinessScenarios } from '@/domain/toolBusinessScenarios';
import { getBusinessScenarioMeta } from '@/domain/businessScenarios';
import { openMarketShelf } from '@/domain/openHomeJourney';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import {
  ensurePlazaToolGuidesBootstrapped,
  usePlazaToolGuideStore,
} from '@/stores/plazaToolGuideStore';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { parseAppRoute } from '@/domain/appRoute';
import type { PlazaToolGuide } from '@/domain/plazaToolGuides';
import { groupGuidesIntoSteps } from '@/domain/howtoSteps';

type DetailTab = 'overview' | 'howto' | 'resources';

export function MarketToolDetailPage() {
  const tools = useMarketplaceStore((s) => s.tools);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const bumpToolInvokes = useMarketplaceStore((s) => s.bumpToolInvokes);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const peekToolId = useNavigationIntentStore((s) => s.peekToolId);
  const consumeReturnTarget = useNavigationIntentStore((s) => s.consumeReturnTarget);
  const focusTool = useNavigationIntentStore((s) => s.focusTool);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const pushRecent = useRecentMarketStore((s) => s.push);

  const [tab, setTab] = useState<DetailTab>('overview');
  const [howToOpen, setHowToOpen] = useState(false);
  const [guidePreview, setGuidePreview] = useState<PlazaToolGuide | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    ensurePlazaToolGuidesBootstrapped();
  }, []);

  useEffect(() => {
    const route = parseAppRoute(window.location.hash);
    if (route.view === 'market-tool' && route.id && !peekToolId()) {
      focusTool(route.id);
    }
  }, [focusTool, peekToolId]);

  const toolId = peekToolId() || parseAppRoute(window.location.hash).id || '';
  const tool = tools.find((t) => t.id === toolId) ?? null;

  const guides = useMemo(
    () =>
      guideRecords
        .filter((r) => r.toolId === toolId)
        .map(({ toolId: _t, ...g }) => g),
    [guideRecords, toolId],
  );
  const steps = useMemo(() => groupGuidesIntoSteps(guides), [guides]);

  useEffect(() => {
    setActiveStep(0);
  }, [toolId]);

  const kind: MarketShelfKind =
    tool?.sourceType === 'internal' || tool?.tags?.includes('hw-internal')
      ? 'internal'
      : 'external';

  const bizLabels = tool
    ? resolveToolBusinessScenarios(tool).map((id) => getBusinessScenarioMeta(id).label)
    : [];

  const goBack = () => {
    const ret = consumeReturnTarget();
    if (ret?.view) {
      setAppView(ret.view);
      return;
    }
    openMarketShelf(kind);
  };

  const openUrl = () => {
    if (!tool?.homepageUrl || tool.homepageUrl === '#') {
      showToast('暂无可用链接，请查看 How to');
      setTab('howto');
      return;
    }
    const win = window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    bumpToolInvokes(tool.id);
    pushRecent({
      id: tool.id,
      kind,
      title: tool.name,
      icon: tool.icon,
      logoUrl: resolveToolLogoUrl(tool),
    });
    if (!win) showToast('浏览器拦截了弹窗，请允许后重试');
    else showToast(`已打开：${tool.name}`);
  };

  if (!tool) {
    return (
      <div className="center-surface flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-[14px] text-zinc-500">未找到该工具，可能已下架或无权限</p>
        <button
          type="button"
          onClick={goBack}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium"
        >
          返回货架
        </button>
      </div>
    );
  }

  const metaRows: { label: string; value: string }[] = [
    {
      label: '类型',
      value: kind === 'internal' ? '内部工具' : '外部工具',
    },
    {
      label: '领域',
      value: (tool.ownerDeptIds ?? []).map(getDeptLabel).filter(Boolean).join('、') || '未标注',
    },
    {
      label: '区域',
      value: tool.ownerRegionId ? getRegionLabel(tool.ownerRegionId) : '不限',
    },
    {
      label: '场景',
      value: bizLabels.join('、') || '通用',
    },
    {
      label: '发布方',
      value: tool.publisher || tool.author || '—',
    },
    {
      label: '调用量',
      value: String(tool.invokes ?? 0),
    },
  ];

  const stepGuides = steps[activeStep]?.guides ?? [];

  return (
    <div className="center-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto w-full max-w-5xl px-6 py-5 md:px-8">
        <button
          type="button"
          onClick={goBack}
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <i className="fa-solid fa-arrow-left text-[10px]" />
          返回货架
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/50 p-5 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.4)] md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-zinc-100">
                  <ToolLogo
                    name={tool.name}
                    logoUrl={resolveToolLogoUrl(tool)}
                    icon={tool.icon}
                    size={48}
                    className="rounded-xl"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 md:text-[24px]">
                      {tool.name}
                    </h1>
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                      {kind === 'internal' ? '内部工具' : '外部工具'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{tool.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openUrl}
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                    >
                      立即使用
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('howto');
                        setHowToOpen(true);
                      }}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      查看 How to
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-1 border-b border-zinc-200">
              {(
                [
                  ['overview', '概览'],
                  ['howto', 'How to'],
                  ['resources', '相关资源'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    '-mb-px px-3.5 py-2.5 text-[12px] font-semibold transition',
                    tab === id
                      ? 'border-b-2 border-zinc-900 text-zinc-900'
                      : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === 'overview' ? (
                <div className="space-y-4 text-[13px] leading-relaxed text-zinc-600">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                      应用场景
                    </p>
                    {bizLabels.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {bizLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-zinc-400">通用 · 未标注专属场景</p>
                    )}
                  </div>
                  {tool.tags?.length ? (
                    <p className="text-[12px] text-zinc-400">
                      标签：
                      {tool.tags
                        .filter((t) => t !== 'ai-saas' && t !== 'hw-internal')
                        .join(' · ') || '—'}
                    </p>
                  ) : null}
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white px-4 py-12 text-center">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-300 ring-1 ring-zinc-100">
                      <i className="fa-regular fa-image text-[18px]" />
                    </span>
                    <p className="text-[13px] font-medium text-zinc-500">预览图 / 演示视频建设中</p>
                    <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-zinc-400">
                      可先查看 How to 上手材料，或直接立即使用打开工具。
                    </p>
                  </div>
                </div>
              ) : null}

              {tab === 'howto' ? (
                guides.length ? (
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <ol className="space-y-1">
                      {steps.map((s, i) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => setActiveStep(i)}
                            className={cn(
                              'flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition',
                              i === activeStep
                                ? 'bg-zinc-900 text-white'
                                : 'hover:bg-zinc-100',
                            )}
                          >
                            <span
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                i === activeStep
                                  ? 'bg-white/20 text-white'
                                  : 'bg-zinc-200 text-zinc-600',
                              )}
                            >
                              {i + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12px] font-semibold">{s.label}</span>
                              <span
                                className={cn(
                                  'mt-0.5 block text-[10px]',
                                  i === activeStep ? 'text-white/70' : 'text-zinc-400',
                                )}
                              >
                                {s.hint}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    <div className="space-y-2">
                      {stepGuides.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() =>
                            openGuideEntry(g, {
                              onPreview: setGuidePreview,
                              onToast: showToast,
                            })
                          }
                          className="flex w-full flex-col rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left hover:border-zinc-300"
                        >
                          <span className="text-[12px] font-semibold text-zinc-800">{g.title}</span>
                          {g.blurb ? (
                            <span className="mt-0.5 text-[11px] text-zinc-400">{g.blurb}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-[12px] text-zinc-400">
                    暂无 How to，可在门户运营维护
                  </p>
                )
              ) : null}

              {tab === 'resources' ? (
                <div className="space-y-3 text-[13px] text-zinc-600">
                  {tool.homepageUrl && tool.homepageUrl !== '#' ? (
                    <a
                      href={tool.homepageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50"
                    >
                      官方入口 / 深链
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                        {tool.homepageUrl}
                      </span>
                    </a>
                  ) : (
                    <p className="text-[12px] text-zinc-400">暂无外链资源</p>
                  )}
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-3">
                    <p className="text-[12px] font-semibold text-zinc-700">评论与评分</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                      暂未开放。当前不做假评论或评分涨跌；反馈可走提报 / 门户运营渠道。
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-[0_10px_28px_-22px_rgba(24,24,27,0.35)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              工具信息
            </p>
            <dl className="mt-3.5 divide-y divide-zinc-100">
              {metaRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 py-2.5 text-[12px] first:pt-0 last:pb-0">
                  <dt className="shrink-0 text-zinc-400">{row.label}</dt>
                  <dd className="text-right font-medium leading-snug text-zinc-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>

      {howToOpen ? (
        <HowToDrawer
          title={tool.name}
          guides={guides}
          stepped
          onClose={() => setHowToOpen(false)}
          onOpenGuide={(g) =>
            openGuideEntry(g, { onPreview: setGuidePreview, onToast: showToast })
          }
        />
      ) : null}
      <HowToGuidePreviewModal guide={guidePreview} onClose={() => setGuidePreview(null)} />
    </div>
  );
}
