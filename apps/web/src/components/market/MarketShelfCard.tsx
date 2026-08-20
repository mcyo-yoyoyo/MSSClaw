import { cn } from '@/lib/utils';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import { downloadAgentFile } from '@/domain/agentExport';
import {
  MARKET_SECURITY_LABEL,
  type MarketShelfCard as MarketShelfCardModel,
} from '@/domain/marketShelf';
import { EXECUTION_TRUST_META } from '@/domain/executionTrust';
import { downloadSkillFile } from '@/domain/skillExport';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketCompareStore } from '@/stores/marketCompareStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import type { ReactNode } from 'react';

export function MarketShelfCard({
  card,
  variant = 'grid',
  showHot = false,
  className,
  onOpen,
  onPrimary,
  onHowTo: _onHowTo,
  primaryLabel: primaryLabelOverride,
  howToLabel: _howToLabel,
  enableCompare = true,
  showTags = true,
  footerActions,
}: {
  card: MarketShelfCardModel;
  variant?: 'grid' | 'featured' | 'compact';
  /** 精选区右上角 HOT 角标 */
  showHot?: boolean;
  className?: string;
  onOpen: () => void;
  onPrimary?: () => void;
  /** @deprecated 卡片只保留「详情」，上手材料在弹窗内 */
  onHowTo?: () => void;
  primaryLabel?: string;
  howToLabel?: string;
  /** 轻量对比勾选（同货架 2–3 项）；首页关闭 */
  enableCompare?: boolean;
  /** 是否展示场景、区域、类型等标签；首页三栏关闭。 */
  showTags?: boolean;
  /** 管理后台专用：将操作集中收纳到卡片内部。 */
  footerActions?: ReactNode;
}) {
  void _onHowTo;
  void _howToLabel;
  const featured = variant === 'featured';
  const compact = variant === 'compact';
  const homeDense = Boolean(className?.includes('home-channel-card'));
  const primaryLabel = primaryLabelOverride ?? '详情';

  const regionTone =
    card.kind === 'external' && card.region === 'overseas'
      ? 'overseas'
      : card.kind === 'external' && card.region === 'domestic'
        ? 'domestic'
        : null;

  const favorited = useMarketFavoriteStore((s) => s.isFavorite(card.id, card.kind));
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const compareSelected = useMarketCompareStore((s) => s.isSelected(card.id, card.kind));
  const toggleCompare = useMarketCompareStore((s) => s.toggle);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const skills = useMarketplaceStore((s) => s.skills);
  const agents = useMarketplaceStore((s) => s.agents);
  const engagement = useContentEngagementStore((s) => s.byId[card.id]);
  const userVote = useContentEngagementStore((s) => s.userVotes[card.id] ?? null);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const bumpFavorite = useContentEngagementStore((s) => s.bumpFavorite);
  const canDownload = card.kind === 'projects';

  const outcomeLine =
    card.kind === 'external' ? card.description : card.outcomeHint?.trim() || card.description;
  const security = card.securityLevel;
  const badges = card.badges ?? [];
  const sceneTags = (card.sceneTags?.length
    ? card.sceneTags
    : badges.filter((b) => b.tone === 'type').map((b) => b.label)
  ).slice(0, 3);

  const onToggleFavorite = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const on = toggleFavorite({
      id: card.id,
      kind: card.kind,
      title: card.title,
      icon: card.icon,
      logoUrl: card.logoUrl,
    });
    bumpFavorite(card.id, on ? 1 : -1);
    showToast(on ? `已收藏：${card.title}` : `已取消收藏：${card.title}`);
  };

  const onDownload = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const skill = skills.find((s) => s.id === card.id);
    if (skill) {
      bumpDownload(card.id);
      downloadSkillFile(skill);
      showToast(`已下载技能包：${skill.name}`);
      return;
    }
    const agent = agents.find((a) => a.id === card.id);
    if (agent) {
      bumpDownload(card.id);
      downloadAgentFile(agent);
      showToast(`已下载 Agent 包：${agent.name}`);
      return;
    }
    showToast('请打开详情后下载');
  };

  const onToggleCompare = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const res = toggleCompare(card);
    if (!res.ok && res.message) showToast(res.message);
  };

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border border-zinc-200/90 bg-white transition duration-200',
        'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_10px_28px_-16px_rgba(24,24,27,0.35)]',
        featured ? 'p-5' : compact ? 'p-3' : homeDense ? 'p-3.5' : 'p-4',
        regionTone === 'overseas' && 'market-card-region-overseas hover:border-transparent',
        regionTone === 'domestic' && 'market-card-region-domestic hover:border-transparent',
        card.kind === 'projects' && 'market-card-mss hover:border-transparent',
        className,
      )}
    >
      {showHot ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-1 -top-1 z-10 inline-flex items-center gap-0.5 rounded-md bg-gradient-to-br from-[#E11D48] via-[#F43F5E] to-[#FB923C] px-1.5 py-[3px] text-[9px] font-extrabold tracking-[0.08em] text-white shadow-[0_4px_10px_-3px_rgba(225,29,72,0.55)] ring-1 ring-white/70"
        >
          HOT
        </span>
      ) : null}
      {card.scopeBadge && !showHot ? (
        <span
          className={cn(
            'absolute right-3 top-3 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
            card.scopeBadge === 'public'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
              : 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
          )}
        >
          {card.scopeBadge === 'public' ? '公开' : '领域'}
        </span>
      ) : null}
      {card.scopeBadge && showHot ? (
        <span
          className={cn(
            'absolute right-3 top-7 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
            card.scopeBadge === 'public'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100'
              : 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
          )}
        >
          {card.scopeBadge === 'public' ? '公开' : '领域'}
        </span>
      ) : null}
      <button type="button" onClick={onOpen} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl bg-white/80 ring-1 ring-black/[0.04]',
              featured ? 'h-14 w-14' : compact || homeDense ? 'h-10 w-10' : 'h-11 w-11',
            )}
          >
            <ToolLogo
              name={card.productName || card.title}
              logoUrl={card.logoUrl}
              icon={card.icon}
              size={featured ? 40 : compact || homeDense ? 28 : 32}
              className="rounded-xl"
            />
          </div>
          <div className={cn('min-w-0 flex-1', card.scopeBadge && 'pr-10')}>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3
                className={cn(
                  'truncate font-semibold tracking-tight text-[#1d1d1f]',
                  featured ? 'text-[17px]' : compact ? 'text-[13px]' : homeDense ? 'text-[14px]' : 'text-[15px]',
                )}
              >
                {card.title}
              </h3>
              {!compact && card.featured && card.kind !== 'projects' ? (
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                  精选
                </span>
              ) : null}
              {!compact && card.runnable ? (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                  可试用
                </span>
              ) : null}
              {!compact && card.executionTrust && card.executionTrust !== 'download_only' ? (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[9px] font-semibold',
                    EXECUTION_TRUST_META[card.executionTrust].badgeClass,
                  )}
                  title={EXECUTION_TRUST_META[card.executionTrust].hint}
                >
                  {EXECUTION_TRUST_META[card.executionTrust].label}
                </span>
              ) : null}
            </div>
            {/* Skill 卡弱化技术名，避免与 Skill ID 冗余感 */}
            {card.productName && !card.scopeBadge ? (
              <p className="mt-0.5 truncate text-[11px] text-[#86868b]">{card.productName}</p>
            ) : null}
            <p
              className={cn(
                'leading-relaxed text-[#6e6e73]',
                card.productName && !card.scopeBadge ? 'mt-1' : 'mt-1.5',
                compact
                  ? 'line-clamp-2 text-[11px]'
                  : card.kind === 'external' || (card.productName && !card.scopeBadge)
                    ? 'line-clamp-2 text-[12px]'
                    : featured
                      ? 'line-clamp-3 text-[13px]'
                      : 'line-clamp-2 text-[12px]',
              )}
            >
              {outcomeLine}
            </p>
          </div>
        </div>
        {!compact && showTags ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              homeDense ? 'mt-2.5' : 'mt-3.5',
            )}
          >
            {security && !homeDense && security !== 'mss' && card.kind !== 'projects' ? (
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                  security === 'external' && 'bg-amber-50 text-amber-800',
                  security === 'internal' && 'bg-teal-50 text-teal-800',
                )}
              >
                {MARKET_SECURITY_LABEL[security]}
              </span>
            ) : null}
            {sceneTags.map((tag) => (
              <span
                key={`scene-${tag}`}
                className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-800"
              >
                {tag}
              </span>
            ))}
            {badges
              .filter((b) => !(b.tone === 'type' && sceneTags.includes(b.label)))
              .slice(0, featured ? 3 : 2)
              .map((b) => (
                <span
                  key={`${b.tone}-${b.label}`}
                  className={cn(
                    'rounded-md bg-zinc-100/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600',
                    b.label === '海外' && 'market-badge-overseas',
                    b.label === '国内' && 'market-badge-domestic',
                    b.tone === 'dept' && 'bg-violet-50 text-violet-800',
                    b.tone === 'region' && 'bg-teal-50 text-teal-800',
                    b.tone === 'type' && 'bg-amber-50 text-amber-800',
                    b.className,
                  )}
                >
                  {b.label}
                </span>
              ))}
          </div>
        ) : null}
      </button>
      <div
        className={cn(
          'flex flex-wrap items-center gap-2 border-t border-black/[0.04]',
          compact ? 'mt-2.5 pt-2.5' : homeDense ? 'mt-2.5 pt-2.5' : 'mt-3.5 pt-3',
        )}
      >
        <div className="mr-auto inline-flex flex-wrap items-center gap-0.5 text-[10px] tabular-nums">
          <span
            className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[#86868b]"
            title="查看"
          >
            <i className="fa-regular fa-eye text-[9px] text-zinc-400" />
            {formatToolInvokes(engagement?.views ?? 0)}
          </span>
          <button
            type="button"
            onClick={onToggleFavorite}
            title={favorited ? '取消收藏' : '收藏'}
            aria-pressed={favorited}
            className={cn(
              'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
              favorited ? 'text-amber-600' : 'text-[#86868b] hover:text-zinc-700',
            )}
          >
            <i className={cn('text-[9px]', favorited ? 'fa-solid fa-star' : 'fa-regular fa-star')} />
            {formatToolInvokes(engagement?.favorites ?? 0)}
          </button>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              toggleLike(card.id);
            }}
            title="点赞"
            aria-pressed={userVote === 'like'}
            className={cn(
              'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
              userVote === 'like' ? 'text-sky-600' : 'text-[#86868b] hover:text-zinc-700',
            )}
          >
            <i className="fa-solid fa-thumbs-up text-[9px]" />
            {formatToolInvokes(engagement?.likes ?? 0)}
          </button>
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              toggleDislike(card.id);
            }}
            title="点踩"
            aria-pressed={userVote === 'dislike'}
            className={cn(
              'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
              userVote === 'dislike' ? 'text-zinc-800' : 'text-[#86868b] hover:text-zinc-700',
            )}
          >
            <i className="fa-solid fa-thumbs-down text-[9px]" />
            {formatToolInvokes(engagement?.dislikes ?? 0)}
          </button>
          {canDownload ? (
            <button
              type="button"
              onClick={onDownload}
              title="下载"
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[#86868b] transition hover:text-zinc-700"
            >
              <i className="fa-solid fa-download text-[9px]" />
              {formatToolInvokes(engagement?.downloads ?? 0)}
            </button>
          ) : null}
        </div>
        {enableCompare ? (
          <button
            type="button"
            onClick={onToggleCompare}
            title={compareSelected ? '取消对比' : '加入对比'}
            aria-label={compareSelected ? '取消对比' : '加入对比'}
            aria-pressed={compareSelected}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg transition',
              compact ? 'h-7 w-7' : 'h-8 w-8',
              compareSelected
                ? 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'bg-black/[0.04] text-zinc-400 hover:bg-black/[0.07] hover:text-zinc-600',
            )}
          >
            <i
              className={cn(
                compact ? 'text-[11px]' : 'text-[12px]',
                'fa-solid fa-code-compare',
                !compareSelected && 'opacity-70',
              )}
            />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPrimary ?? onOpen}
          className={cn(
            'ml-0.5 shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition',
            'hover:bg-zinc-200/80 hover:text-zinc-600',
            compact ? 'px-2.5 py-1 text-[10px]' : null,
          )}
        >
          {primaryLabel}
        </button>
      </div>
      {footerActions ? (
        <div className="mt-2" onClick={(event) => event.stopPropagation()}>
          {footerActions}
        </div>
      ) : null}
    </article>
  );
}
