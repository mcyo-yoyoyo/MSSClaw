import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import {
  resolveOfficeScenesWithCatalog,
  resolveOfficeToolWithCatalog,
  type InternalOfficeScene,
  type InternalOfficeSceneTool,
} from '@/domain/internalOfficeScenes';
import { sortByRankMode, type RankMode } from '@/domain/contentEngagement';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { ShelfSectionHead } from '@/components/market/ShelfRankSelect';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type PickerMode = 'detail' | 'howto' | 'experience';

const ASSISTANT_TOOL_ID = 'tool-hw-assistant';

function sceneEngagementId(sceneId: string) {
  return `office-scene-${sceneId}`;
}

export function InternalOfficeSceneGrid({
  search,
  catalogTools,
  rankMode = 'most_viewed',
  onRankModeChange,
  onOpenDetail,
  onHowTo,
  onExperience,
  onEmptyAction,
}: {
  search: string;
  /** 配置工具主数据：覆盖场景默认链接 / Logo */
  catalogTools: PrototypeToolSeed[];
  rankMode?: RankMode;
  onRankModeChange?: (next: RankMode) => void;
  onOpenDetail: (tool: InternalOfficeSceneTool) => void;
  onHowTo: (tool: InternalOfficeSceneTool) => void;
  onExperience: (tool: InternalOfficeSceneTool) => void;
  /** 场景无可用工具时点击反馈（toast） */
  onEmptyAction?: (scene: InternalOfficeScene, mode: PickerMode) => void;
}) {
  const [picker, setPicker] = useState<{
    scene: InternalOfficeScene;
    mode: PickerMode;
  } | null>(null);
  const sceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const bumpView = useContentEngagementStore((s) => s.bumpView);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);

  const allScenes = useMemo(
    () => resolveOfficeScenesWithCatalog(catalogTools, sceneEntries),
    [catalogTools, sceneEntries],
  );

  const assistantTool = useMemo(() => {
    const fromScene = allScenes
      .flatMap((s) => s.tools)
      .find((t) => t.id === ASSISTANT_TOOL_ID);
    if (fromScene) return fromScene;
    const seed = catalogTools.find((t) => t.id === ASSISTANT_TOOL_ID) ?? null;
    return resolveOfficeToolWithCatalog(
      {
        id: ASSISTANT_TOOL_ID,
        name: '员工助手',
        blurb: '综合知识问答',
        homepageUrl: '#',
        logoUrl: '',
      },
      seed,
    );
  }, [allScenes, catalogTools]);

  const scenes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? allScenes.filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.english.toLowerCase().includes(q) ||
            s.tools.some(
              (t) =>
                t.name.toLowerCase().includes(q) || t.blurb.toLowerCase().includes(q),
            ),
        )
      : allScenes;
    return sortByRankMode(filtered, rankMode, (id) => getEngagement(sceneEngagementId(id)));
  }, [allScenes, search, rankMode, getEngagement, engagementById]);

  const runWithTool = (scene: InternalOfficeScene, mode: PickerMode) => {
    if (!scene.tools.length) {
      onEmptyAction?.(scene, mode);
      return;
    }
    if (scene.tools.length === 1) {
      const tool = scene.tools[0]!;
      if (mode === 'experience') bumpUse(sceneEngagementId(scene.id));
      else bumpView(sceneEngagementId(scene.id));
      if (mode === 'experience') onExperience(tool);
      else if (mode === 'howto') onHowTo(tool);
      else onOpenDetail(tool);
      return;
    }
    setPicker({ scene, mode });
  };

  const pickTool = (tool: InternalOfficeSceneTool) => {
    if (!picker) return;
    const { mode } = picker;
    setPicker(null);
    if (mode === 'experience') bumpUse(sceneEngagementId(picker.scene.id));
    else bumpView(sceneEngagementId(picker.scene.id));
    if (mode === 'experience') onExperience(tool);
    else if (mode === 'howto') onHowTo(tool);
    else onOpenDetail(tool);
  };

  const emptyCopy = search.trim()
    ? '当前搜索下暂无场景'
    : '暂无可用办公场景，请联系运营配置工具绑定';

  return (
    <>
      <section className="flex flex-col gap-5 pb-4">
        <button
          type="button"
          className="internal-assistant-chat shrink-0"
          onClick={() => onExperience(assistantTool)}
          aria-label="员工助手"
        >
          <div className="internal-assistant-chat__head">
            {assistantTool.logoUrl ? (
              <img
                src={assistantTool.logoUrl}
                alt=""
                className="internal-assistant-chat__logo"
                loading="lazy"
              />
            ) : (
              <span className="internal-assistant-chat__logo inline-flex items-center justify-center">
                <i className="fa-solid fa-robot text-[12px] text-[#a1a1aa]" />
              </span>
            )}
            <div className="internal-assistant-chat__copy">
              <p className="internal-assistant-chat__name">{assistantTool.name || '员工助手'}</p>
            </div>
            <span className="internal-assistant-chat__badge">待上线</span>
          </div>
          <div className="internal-assistant-chat__composer" aria-hidden>
            <span className="min-w-0 flex-1 truncate">给员工助手发送消息…</span>
            <span className="internal-assistant-chat__send">
              <i className="fa-solid fa-arrow-up text-[10px]" />
            </span>
          </div>
        </button>

        <div className="flex flex-col gap-3">
        {onRankModeChange ? (
          <ShelfSectionHead
            title="办公场景"
            count={scenes.length}
            rankMode={rankMode}
            onRankChange={onRankModeChange}
            className="mb-0"
          />
        ) : null}

        {scenes.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {scenes.map((scene) => {
              const hasTools = scene.tools.length > 0;
              return (
                <article
                  key={scene.id}
                  className={cn(
                    'flex h-full min-h-[168px] flex-col rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 transition',
                    hasTools
                      ? 'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_10px_24px_-16px_rgba(24,24,27,0.35)]'
                      : 'opacity-80',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => runWithTool(scene, 'detail')}
                    className="flex min-h-0 flex-1 flex-col text-left"
                  >
                    <div className="flex shrink-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[20px] font-semibold leading-snug tracking-tight text-zinc-900">
                          {scene.label}
                        </h3>
                      </div>
                      <div className="flex shrink-0 -space-x-1.5">
                        {hasTools ? (
                          scene.tools.slice(0, 3).map((t) => (
                            <img
                              key={`${scene.id}-${t.id}`}
                              src={t.logoUrl}
                              alt={`${t.name} Logo`}
                              className="h-7 w-7 rounded-full bg-zinc-50 object-cover ring-2 ring-white"
                              loading="lazy"
                            />
                          ))
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-400">
                            待配置
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2.5 line-clamp-2 flex-1 text-[13px] leading-snug text-zinc-500">
                      {scene.description}
                    </p>
                    {!hasTools ? (
                      <p className="mt-1 shrink-0 text-[10px] text-amber-700/80">
                        暂无已发布工具，请运营绑定后体验
                      </p>
                    ) : null}
                  </button>
                  <div className="mt-3 flex shrink-0 items-center gap-2 border-t border-zinc-100 pt-2.5">
                    <SceneCardStats scene={scene} />
                    <button
                      type="button"
                      disabled={!hasTools}
                      onClick={() => runWithTool(scene, 'detail')}
                      className={cn(
                        'ml-auto shrink-0 rounded-lg bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-500 transition',
                        hasTools
                          ? 'hover:bg-zinc-200/80 hover:text-zinc-600'
                          : 'cursor-not-allowed text-zinc-300',
                      )}
                    >
                      详情
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-[13px] text-zinc-400">
            {emptyCopy}
          </div>
        )}
        </div>
      </section>

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="关闭工具选择"
            onClick={() => setPicker(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-semibold text-zinc-900">{picker.scene.label}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                  这项工作可由多个内部产品完成，请选择要查看的工具。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="rounded-lg px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-50"
              >
                关闭
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {picker.scene.tools.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pickTool(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200/90 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <img
                      src={t.logoUrl}
                      alt={`${t.name} Logo`}
                      className="h-8 w-8 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">{t.name}</p>
                      <p className="truncate text-[11px] text-zinc-500">{t.blurb}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500">
                      详情
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SceneCardStats({ scene }: { scene: InternalOfficeScene }) {
  const engagementId = sceneEngagementId(scene.id);
  const primary = scene.tools[0];
  const engagement = useContentEngagementStore((s) => s.byId[engagementId]);
  const userVote = useContentEngagementStore((s) => s.userVotes[engagementId] ?? null);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const bumpFavorite = useContentEngagementStore((s) => s.bumpFavorite);
  const favorited = useMarketFavoriteStore((s) =>
    primary ? s.isFavorite(primary.id, 'internal') : false,
  );
  const toggleFavorite = useMarketFavoriteStore((s) => s.toggle);
  const showToast = useMarketplaceStore((s) => s.showToast);

  const onToggleFavorite = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!primary) return;
    const on = toggleFavorite({
      id: primary.id,
      kind: 'internal',
      title: primary.name,
      icon: 'fa-cube',
      logoUrl: primary.logoUrl,
    });
    bumpFavorite(engagementId, on ? 1 : -1);
    showToast(on ? `已收藏：${primary.name}` : `已取消收藏：${primary.name}`);
  };

  return (
    <div className="mr-auto inline-flex flex-wrap items-center gap-0.5 text-[10px] tabular-nums">
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[#86868b]" title="查看">
        <i className="fa-regular fa-eye text-[9px] text-zinc-400" />
        {formatToolInvokes(engagement?.views ?? 0)}
      </span>
      <button
        type="button"
        onClick={onToggleFavorite}
        disabled={!primary}
        title={favorited ? '取消收藏' : '收藏'}
        aria-pressed={favorited}
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition',
          !primary && 'cursor-not-allowed opacity-40',
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
          toggleLike(engagementId);
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
          toggleDislike(engagementId);
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
    </div>
  );
}
