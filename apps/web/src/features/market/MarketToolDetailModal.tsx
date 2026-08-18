import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { CenterModal } from '@/components/center/CenterShell';
import { resolveToolLogoUrl } from '@/domain/toolLogo';
import { EXTERNAL_TOOLS_CATALOG } from '@/domain/externalToolsCatalog';
import type { MarketShelfKind } from '@/domain/marketShelf';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { TOOL_EXTERNAL_WARNING_RULES } from '@/domain/externalToolDelivery';
import { useRecentMarketStore } from '@/stores/recentMarketStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';

function resolveToolKind(tool: PrototypeToolSeed | null): MarketShelfKind {
  if (tool?.sourceType === 'internal' || tool?.tags?.includes('hw-internal')) {
    return 'internal';
  }
  return 'external';
}

function clipText(text: string, max = 220): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** 从官网材料里抽出「产品详细介绍」前两段，去掉操作步骤 */
function extractOfficialIntro(guideBody?: string): string {
  if (!guideBody?.trim()) return '';
  const idx = guideBody.indexOf('产品详细介绍：');
  let rest = (idx >= 0 ? guideBody.slice(idx + '产品详细介绍：'.length) : guideBody).trim();
  rest = rest.split(/\n[1-4]\.\s/)[0] ?? rest;
  rest = rest.split(/\n示例：/)[0] ?? rest;
  const paras = rest
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('卡片核心作用'));
  return paras.slice(0, 2).join('');
}

function findCatalogTool(tool: PrototypeToolSeed) {
  const name = tool.name.trim().toLocaleLowerCase();
  return EXTERNAL_TOOLS_CATALOG.find(
    (entry) => entry.id === tool.id || entry.name.trim().toLocaleLowerCase() === name,
  );
}

/** 是什么：官网产品介绍精炼，不写使用场景清单 */
function pickWhatItIs(tool: PrototypeToolSeed): string {
  if (tool.productIntro?.trim()) return clipText(tool.productIntro, 1200);
  const catalog = findCatalogTool(tool);
  const official = extractOfficialIntro(catalog?.guideBody);
  if (official) return clipText(official, 220);
  return clipText(
    catalog?.productIntro?.trim() || tool.desc?.trim() || '',
    220,
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-400">{children}</p>
  );
}

export function MarketToolDetailModal({
  toolId,
  onClose,
}: {
  toolId: string;
  onClose: () => void;
}) {
  const tools = useMarketplaceStore((s) => s.tools);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const bumpToolInvokes = useMarketplaceStore((s) => s.bumpToolInvokes);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const pushRecent = useRecentMarketStore((s) => s.push);
  const favItems = useMarketFavoriteStore((s) => s.items);
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);

  const [showExternalWarning, setShowExternalWarning] = useState(false);

  const tool = tools.find((t) => t.id === toolId) ?? null;
  const kind = resolveToolKind(tool);
  const isFav = favItems.some((x) => x.id === toolId && x.kind === kind);

  const openUrl = () => {
    if (!tool) return;
    if (!tool.homepageUrl || tool.homepageUrl === '#') {
      // 没有可用入口时不计入跳转量，否则「跳转官网」会被无效点击灌水
      showToast('暂无可用入口');
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

  const confirmExternalOpen = () => {
    setShowExternalWarning(false);
    openUrl();
  };

  const onToggleFavorite = () => {
    if (!tool) return;
    const on = toggleFavorite({
      id: tool.id,
      kind,
      title: tool.name,
      icon: tool.icon,
      logoUrl: resolveToolLogoUrl(tool),
    });
    showToast(on ? `已收藏：${tool.name}` : `已取消收藏：${tool.name}`);
  };

  if (!tool) {
    return (
      <CenterModal open title="工具详情" onClose={onClose} size="lg">
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12">
          <p className="text-[14px] text-zinc-500">未找到该工具，可能已下架或无权限</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-[12px] font-medium"
          >
            关闭
          </button>
        </div>
      </CenterModal>
    );
  }

  const whatItIs = pickWhatItIs(tool);
  const kindLabel = kind === 'internal' ? '公司工具' : '外部工具';
  const hasHome = Boolean(tool.homepageUrl && tool.homepageUrl !== '#');
  const hasDocs = Boolean(tool.docsUrl?.trim());
  const regionLabel =
    kind === 'external'
      ? tool.region === 'domestic'
        ? '国内'
        : tool.region === 'overseas'
          ? '海外'
          : null
      : null;

  return (
    <>
      <CenterModal
        open
        title={tool.name}
        onClose={onClose}
        size="xl"
        fitContent
        header={
          <div className="shrink-0 border-b border-zinc-100 bg-white px-5 py-3.5 md:px-6">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-zinc-100">
                <ToolLogo
                  name={tool.name}
                  logoUrl={resolveToolLogoUrl(tool)}
                  icon={tool.icon}
                  size={40}
                  className="rounded-lg"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[17px] font-semibold tracking-tight text-zinc-900">
                        {tool.name}
                      </h3>
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                          kind === 'internal'
                            ? 'bg-teal-50 text-teal-800'
                            : 'bg-amber-50 text-amber-800',
                        )}
                      >
                        {kindLabel}
                      </span>
                      {regionLabel ? (
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                            regionLabel === '海外'
                              ? 'market-badge-overseas'
                              : 'market-badge-domestic',
                          )}
                        >
                          {regionLabel}
                        </span>
                      ) : null}
                      {tool.company?.trim() ? (
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                          {tool.company.trim()}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
                      {kind === 'internal'
                        ? '公司统一入口的内部工具'
                        : regionLabel
                          ? `${regionLabel}第三方工具`
                          : '第三方工具'}
                    </p>
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
              </div>
            </div>
          </div>
        }
        actions={
          <div className="flex w-full items-center justify-between gap-3">
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                isFav
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <i className={cn(isFav ? 'fa-solid fa-star' : 'fa-regular fa-star', 'text-[10px]')} />
              {isFav ? '已收藏' : '收藏'}
            </button>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03]"
              >
                关闭
              </button>
              {hasDocs ? (
                <a
                  href={tool.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/8 px-3.5 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03]"
                >
                  <i className="fa-regular fa-file-lines text-[10px]" />
                  使用指导
                </a>
              ) : null}
              {hasHome ? (
                <button
                  type="button"
                  onClick={() => (kind === 'external' ? setShowExternalWarning(true) : openUrl())}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  立即体验
                </button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="space-y-6 px-5 py-5 md:px-6">
          <section>
            <SectionTitle>产品详细介绍</SectionTitle>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-zinc-600">
              {whatItIs || `${tool.name} 是一款${kindLabel}。`}
            </p>
          </section>

          {tool.toolTypeLabels?.length ? (
            <section>
              <SectionTitle>工具类型</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {tool.toolTypeLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {tool.bestFor?.trim() ? (
            <section>
              <SectionTitle>最适合</SectionTitle>
              <p className="text-[13px] leading-relaxed text-zinc-600">{tool.bestFor}</p>
            </section>
          ) : null}

          {tool.coreCapabilities?.length ? (
            <section>
              <SectionTitle>核心能力</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {tool.coreCapabilities.map((capability) => (
                  <span
                    key={capability}
                    className="rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

        </div>
      </CenterModal>
      <CenterModal
        open={showExternalWarning}
        title="外部网站安全提示"
        onClose={() => setShowExternalWarning(false)}
        size="md"
        elevate
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowExternalWarning(false)}
              className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirmExternalOpen}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
            >
              确认并前往
            </button>
          </>
        }
      >
        <div className="space-y-2.5">
          {TOOL_EXTERNAL_WARNING_RULES.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-3.5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-100/80">
                <i className={cn('fa-solid text-[12px] text-rose-600', rule.icon)} />
              </span>
              <p className="text-[12px] leading-relaxed text-zinc-600">
                <span className="mr-1 text-[13px] font-semibold text-zinc-900">
                  {rule.label}：
                </span>
                {rule.body}
              </p>
            </div>
          ))}
        </div>
      </CenterModal>
    </>
  );
}

/** 全局挂载：货架 / 首页 / 个人中心点击工具后停留当前页打开弹窗 */
export function MarketToolDetailHost() {
  const toolId = useNavigationIntentStore((s) => s.pendingToolId);
  const clearTool = useNavigationIntentStore((s) => s.clearTool);
  if (!toolId) return null;
  return <MarketToolDetailModal toolId={toolId} onClose={clearTool} />;
}
