import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import {
  HowToGuidePreviewModal,
  HowtoGuideList,
  openGuideEntry,
} from '@/components/market/HowToPanel';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { resolveToolBusinessScenarios } from '@/domain/toolBusinessScenarios';
import { getBusinessScenarioMeta } from '@/domain/businessScenarios';
import { resolveExternalToolTypeMeta } from '@/domain/externalTaxonomyCatalog';
import { ExternalComplianceBanner } from '@/components/market/ExternalComplianceBanner';
import { openMarketShelf } from '@/domain/openHomeJourney';
import type { MarketShelfKind } from '@/domain/marketShelf';
import { MARKET_SECURITY_LABEL } from '@/domain/marketShelf';
import { useExternalTaxonomyCatalogStore } from '@/stores/externalTaxonomyCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import {
  ensurePlazaToolGuidesBootstrapped,
  usePlazaToolGuideStore,
} from '@/stores/plazaToolGuideStore';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { parseAppRoute } from '@/domain/appRoute';
import type { PlazaToolGuide } from '@/domain/plazaToolGuides';

type DetailTab = 'overview' | 'howto' | 'resources';

export function MarketToolDetailPage() {
  const tools = useMarketplaceStore((s) => s.tools);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const bumpToolInvokes = useMarketplaceStore((s) => s.bumpToolInvokes);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const peekToolId = useNavigationIntentStore((s) => s.peekToolId);
  const consumeReturnTarget = useNavigationIntentStore((s) => s.consumeReturnTarget);
  const peekReturnTarget = useNavigationIntentStore((s) => s.peekReturnTarget);
  const pendingToolDetailTab = useNavigationIntentStore((s) => s.pendingToolDetailTab);
  const focusTool = useNavigationIntentStore((s) => s.focusTool);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const externalTaxonomy = useExternalTaxonomyCatalogStore((s) => s.catalog);

  const [tab, setTab] = useState<DetailTab>('overview');
  const [guidePreview, setGuidePreview] = useState<PlazaToolGuide | null>(null);

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

  // 读 pending tab，不在此 consume，避免 Strict Mode 二次挂载把 howto 冲成 overview
  useEffect(() => {
    setTab(pendingToolDetailTab ?? 'overview');
  }, [toolId, pendingToolDetailTab]);

  const kind: MarketShelfKind = (() => {
    if (tool?.sourceType === 'internal' || tool?.tags?.includes('hw-internal')) {
      return 'internal';
    }
    if (tool) return 'external';
    const ret = peekReturnTarget();
    if (ret?.view === 'market-internal') return 'internal';
    if (ret?.view === 'market-projects') return 'projects';
    return 'external';
  })();

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
    if (!tool) return;
    if (!tool.homepageUrl || tool.homepageUrl === '#') {
      showToast('暂无可用链接，请查看快速上手');
      setTab('howto');
      bumpUse(tool.id);
      return;
    }
    const win = window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    bumpToolInvokes(tool.id);
    bumpUse(tool.id);
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

  const typeMeta = resolveExternalToolTypeMeta(tool.toolTypeId, externalTaxonomy);
  const heroBlurb = tool.cardSummary?.trim() || tool.desc;
  const introText = tool.productIntro?.trim() || tool.desc?.trim() || '';
  const hasScreenshot = Boolean(tool.screenshotUrl?.trim());
  const hasMedia = Boolean(tool.mediaUrl?.trim());

  const metaRows: { label: string; value: string }[] = [
    {
      label: '类型',
      value: kind === 'internal' ? '内部工具' : '外部工具',
    },
    ...(kind === 'external'
      ? [
          {
            label: '目录区域',
            value:
              tool.region === 'domestic'
                ? '国内'
                : tool.region === 'overseas'
                  ? '海外'
                  : '未标注',
          },
          {
            label: '工具类型',
            value: typeMeta?.label ?? '未标注',
          },
        ]
      : []),
    ...(tool.company
      ? [{ label: '厂商', value: tool.company }]
      : []),
    {
      label: '领域',
      value: (tool.ownerDeptIds ?? []).map(getDeptLabel).filter(Boolean).join('、') || '未标注',
    },
    {
      label: '组织区域',
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

        {kind === 'external' ? <ExternalComplianceBanner className="mb-4" dense /> : null}

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
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        kind === 'external'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-teal-50 text-teal-800',
                      )}
                    >
                      {MARKET_SECURITY_LABEL[kind === 'internal' ? 'internal' : 'external']}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                    {tool.bestFor?.trim() || heroBlurb}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openUrl}
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                    >
                      立即体验
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        bumpUse(tool.id);
                        setTab('howto');
                      }}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      快速上手
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-1 border-b border-zinc-200">
              {(
                [
                  ['overview', '概览'],
                  ['howto', '快速上手'],
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
                  {introText ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                        产品介绍
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">
                        {introText}
                      </p>
                    </div>
                  ) : null}
                  {tool.bestFor?.trim() ? (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                        最适合
                      </p>
                      <p className="text-[13px] text-zinc-600">{tool.bestFor.trim()}</p>
                    </div>
                  ) : null}
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
                  {hasScreenshot || hasMedia ? (
                    <div className="space-y-3">
                      {hasScreenshot ? (
                        <a
                          href={tool.screenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
                        >
                          <img
                            src={tool.screenshotUrl}
                            alt={`${tool.name} 预览`}
                            className="max-h-[360px] w-full object-contain object-center"
                          />
                        </a>
                      ) : null}
                      {hasMedia ? (
                        <a
                          href={tool.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          <i className="fa-solid fa-play text-[11px] text-zinc-400" />
                          打开演示 / 介绍媒体
                          <span className="min-w-0 truncate text-[11px] font-normal text-zinc-400">
                            {tool.mediaUrl}
                          </span>
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-gradient-to-b from-zinc-50/80 to-white px-4 py-10 text-center">
                      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-zinc-300 ring-1 ring-zinc-100">
                        <i className="fa-regular fa-image text-[18px]" />
                      </span>
                      <p className="text-[13px] font-medium text-zinc-500">预览图 / 演示视频建设中</p>
                      <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-zinc-400">
                        可先查看快速上手材料，或直接去使用打开工具。
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {tab === 'howto' ? (
                <div className="space-y-3">
                  <p className="text-[12px] text-zinc-400">
                    按运营配置顺序查看材料，点击即可预览或打开。
                  </p>
                  <HowtoGuideList
                    guides={guides}
                    onOpenGuide={(g) =>
                      openGuideEntry(g, {
                        onPreview: setGuidePreview,
                        onToast: showToast,
                      })
                    }
                  />
                </div>
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
                  ) : null}
                  {tool.docsUrl?.trim() ? (
                    <a
                      href={tool.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50"
                    >
                      帮助文档
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                        {tool.docsUrl}
                      </span>
                    </a>
                  ) : null}
                  {tool.mediaUrl?.trim() ? (
                    <a
                      href={tool.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50"
                    >
                      演示 / 介绍媒体
                      <span className="mt-0.5 block truncate text-[11px] text-zinc-400">
                        {tool.mediaUrl}
                      </span>
                    </a>
                  ) : null}
                  {!(tool.homepageUrl && tool.homepageUrl !== '#') &&
                  !tool.docsUrl?.trim() &&
                  !tool.mediaUrl?.trim() ? (
                    <p className="text-[12px] text-zinc-400">暂无外链资源</p>
                  ) : null}
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

      <HowToGuidePreviewModal guide={guidePreview} onClose={() => setGuidePreview(null)} />
    </div>
  );
}
