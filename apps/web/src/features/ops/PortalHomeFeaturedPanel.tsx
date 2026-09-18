import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterSearchInput } from '@/components/center/CenterShell';
import { ToolLogo } from '@/components/brand/ToolLogo';
import {
  HOME_CHANNEL_DISPLAY_COUNT,
  HOME_CHANNEL_KINDS,
  HOME_CHANNEL_TITLE_COLOR,
  HOME_FEATURED_MAX_PER_CHANNEL,
  homeFeaturedCardRef,
  legacyHomeChannelCards,
  legacyHomeFeaturedChannels,
  listHomeFeaturedCandidates,
  type HomeChannelCardContext,
  type HomeFeaturedChannels,
} from '@/domain/homeFeatured';
import {
  MARKET_SHELF_META,
  type MarketShelfCard,
  type MarketShelfKind,
} from '@/domain/marketShelf';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useExternalToolLayoutStore } from '@/stores/externalToolLayoutStore';
import { useHomeFeaturedStore } from '@/stores/homeFeaturedStore';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePlazaToolGuideStore } from '@/stores/plazaToolGuideStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type DragSource = { kind: MarketShelfKind; index: number };

function sameChannels(a: HomeFeaturedChannels, b: HomeFeaturedChannels): boolean {
  return HOME_CHANNEL_KINDS.every(
    (kind) => a[kind].length === b[kind].length && a[kind].every((ref, i) => ref === b[kind][i]),
  );
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function cardSubtitle(card: MarketShelfCard): string {
  if (card.kind === 'projects') return card.assetType === 'agent' ? 'Agent' : 'Skill';
  return card.productName || card.description || '';
}

/** 门户运营 · 首页三个精选框的内容与排序（首页唯一数据来源） */
export function PortalHomeFeaturedPanel() {
  const tools = useMarketplaceStore((s) => s.tools);
  const skills = useMarketplaceStore((s) => s.skills);
  const agents = useMarketplaceStore((s) => s.agents);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const guideRecords = usePlazaToolGuideStore((s) => s.records);
  const externalToolLayout = useExternalToolLayoutStore((s) => s.document);
  const hydrateExternalToolLayout = useExternalToolLayoutStore((s) => s.hydrate);
  const officeSceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const apiConnected = useWorkspaceStore((s) => s.apiConnected);

  const savedChannels = useHomeFeaturedStore((s) => s.channels);
  const loaded = useHomeFeaturedStore((s) => s.loaded);
  const loading = useHomeFeaturedStore((s) => s.loading);
  const saving = useHomeFeaturedStore((s) => s.saving);
  const error = useHomeFeaturedStore((s) => s.error);
  const hydrate = useHomeFeaturedStore((s) => s.hydrate);
  const save = useHomeFeaturedStore((s) => s.save);

  const canManage = user?.platformRole === 'super_admin';
  const [edits, setEdits] = useState<HomeFeaturedChannels | null>(null);
  const [searchByKind, setSearchByKind] = useState<Record<MarketShelfKind, string>>({
    external: '',
    internal: '',
    projects: '',
  });
  const [drag, setDrag] = useState<DragSource | null>(null);

  useEffect(() => {
    setEdits(null);
    if (!workspaceId || !apiConnected) return;
    void hydrate(workspaceId);
    // 仅用于「从未保存过首页配置」时按旧规则预填草稿。
    void hydrateExternalToolLayout(workspaceId);
  }, [workspaceId, apiConnected, hydrate, hydrateExternalToolLayout]);

  const cardContext = useMemo<HomeChannelCardContext>(
    () => ({
      tools,
      skills,
      agents,
      viewer: {
        userId: user?.id,
        userName: user?.name,
        affiliation: { deptIds: user?.deptIds ?? [], regionId: user?.regionId ?? null },
        role: user?.platformRole,
      },
      engagementOf,
      howtoToolIds: new Set(guideRecords.map((record) => record.toolId)),
      canRunSkills: false,
      canRunAgents: false,
    }),
    [tools, skills, agents, user, engagementOf, guideRecords],
  );

  const candidates = useMemo(() => listHomeFeaturedCandidates(cardContext), [cardContext]);

  const baseline = useMemo<HomeFeaturedChannels>(
    () =>
      savedChannels ??
      legacyHomeFeaturedChannels(
        legacyHomeChannelCards({ ...cardContext, externalToolLayout, officeSceneEntries }),
      ),
    [savedChannels, cardContext, externalToolLayout, officeSceneEntries],
  );

  const current = edits ?? baseline;
  const dirty = edits !== null && !sameChannels(edits, baseline);
  const configured = Boolean(savedChannels);

  const candidateByRef = useMemo(() => {
    const map = {} as Record<MarketShelfKind, Map<string, MarketShelfCard>>;
    for (const kind of HOME_CHANNEL_KINDS) {
      map[kind] = new Map(candidates[kind].map((card) => [homeFeaturedCardRef(card), card]));
    }
    return map;
  }, [candidates]);

  /** 已失效引用也显示名称，便于运营判断是下架还是删除。 */
  const fallbackName = (kind: MarketShelfKind, ref: string): string => {
    if (kind === 'projects') {
      const [type, ...rest] = ref.split(':');
      const id = rest.join(':');
      const found =
        type === 'agent'
          ? agents.find((agent) => agent.id === id)?.name
          : skills.find((skill) => skill.id === id)?.name;
      return found || ref;
    }
    return tools.find((tool) => tool.id === ref)?.name || ref;
  };

  const updateChannel = (kind: MarketShelfKind, next: string[]) => {
    setEdits({ ...current, [kind]: next });
  };

  const handleSave = async () => {
    if (!canManage || saving) return;
    const ok = await save(current);
    if (ok) {
      setEdits(null);
      showToast('首页配置已保存，首页将按此顺序展示');
    }
  };

  if (!apiConnected) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
        未连接后端，无法加载首页配置。
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-14 text-center text-[13px] text-zinc-400">
        {loading ? '正在加载首页配置…' : error || '首页配置尚未加载。'}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="portal-home-featured-panel">
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[12px] leading-relaxed text-zinc-500">
              配置首页「外部工具精选 / 内部办公推荐 / AI工具Hub」三个精选框的内容与顺序。每栏展示前{' '}
              {HOME_CHANNEL_DISPLAY_COUNT} 个可用内容，其后为候补：排在前面的内容下架、被删除或当前用户无权查看时，依次补位。
            </p>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              首页只读取这里的配置；「工具运营」精选、办公场景顺序、Skill / Agent 精选标记都不会影响首页。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {dirty ? (
              // 与按钮同行展示，避免出现提示时列表下移、让运营点错排序按钮。
              <span className="text-[11px] font-medium text-sky-700">有未保存的修改</span>
            ) : null}
            {dirty ? (
              <button
                type="button"
                onClick={() => setEdits(null)}
                disabled={saving}
                className="rounded-xl border border-zinc-200 px-3.5 py-2 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                撤销修改
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canManage || saving || (configured && !dirty)}
              className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? '保存中…' : configured ? '保存' : '保存并启用'}
            </button>
          </div>
        </div>
        {!configured ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
            尚未保存首页配置：首页暂时沿用旧规则展示。下方已按当前首页内容预填，点击「保存并启用」后首页改为只读取这里的配置。
          </p>
        ) : null}
        {!canManage ? (
          <p className="mt-3 text-[11px] text-zinc-400">当前账号只能查看；仅超级管理员可修改首页配置。</p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {HOME_CHANNEL_KINDS.map((kind) => {
          const refs = current[kind];
          const selected = new Set(refs);
          const keyword = searchByKind[kind].trim().toLocaleLowerCase();
          const available = candidates[kind].filter((card) => {
            if (selected.has(homeFeaturedCardRef(card))) return false;
            if (!keyword) return true;
            return [card.title, card.productName, card.description]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase()
              .includes(keyword);
          });
          const full = refs.length >= HOME_FEATURED_MAX_PER_CHANNEL;
          const shownRefs = new Set(
            refs
              .filter((ref) => candidateByRef[kind].has(ref))
              .slice(0, HOME_CHANNEL_DISPLAY_COUNT),
          );

          return (
            <section
              key={kind}
              className="flex min-w-0 flex-col rounded-2xl border border-zinc-200/90 bg-white"
              data-home-featured-channel={kind}
            >
              <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
                <h3
                  className="text-[15px] font-semibold"
                  style={{ color: HOME_CHANNEL_TITLE_COLOR[kind] }}
                >
                  {MARKET_SHELF_META[kind].label}
                </h3>
                <span className="text-[11px] tabular-nums text-zinc-400">
                  已选 {refs.length} / {HOME_FEATURED_MAX_PER_CHANNEL}
                </span>
              </header>

              <ol className="space-y-1.5 p-2.5">
                {refs.length ? (
                  refs.map((ref, index) => {
                    const card = candidateByRef[kind].get(ref);
                    const shown = shownRefs.has(ref);
                    const dragging = drag?.kind === kind && drag.index === index;
                    return (
                      <li
                        key={ref}
                        draggable={canManage && !saving}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          setDrag({ kind, index });
                        }}
                        onDragOver={(event) => {
                          if (drag?.kind === kind) event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (drag?.kind === kind) updateChannel(kind, moveItem(refs, drag.index, index));
                          setDrag(null);
                        }}
                        onDragEnd={() => setDrag(null)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-2 py-2 transition',
                          shown ? 'border-zinc-200 bg-white' : 'border-dashed border-zinc-200 bg-zinc-50/70',
                          dragging && 'opacity-40',
                          canManage && !saving && 'cursor-grab active:cursor-grabbing',
                        )}
                      >
                        <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-zinc-400">
                          {index + 1}
                        </span>
                        {card ? (
                          <ToolLogo
                            name={card.title}
                            logoUrl={card.logoUrl}
                            icon={card.icon}
                            size={28}
                            className="rounded-lg"
                          />
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                            <i className="fa-solid fa-triangle-exclamation text-[11px]" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-zinc-800">
                            {card ? card.title : fallbackName(kind, ref)}
                          </p>
                          <p className="truncate text-[10px] text-zinc-400">
                            {card ? cardSubtitle(card) : '已下架或不存在，首页会跳过'}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                            !card
                              ? 'bg-red-50 text-red-600'
                              : shown
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-zinc-100 text-zinc-500',
                          )}
                        >
                          {!card ? '失效' : shown ? '首页展示' : '候补'}
                        </span>
                        {canManage ? (
                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              disabled={saving || index === 0}
                              onClick={() => updateChannel(kind, moveItem(refs, index, index - 1))}
                              className="rounded-md p-1 text-[10px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                              aria-label="上移"
                            >
                              <i className="fa-solid fa-arrow-up" />
                            </button>
                            <button
                              type="button"
                              disabled={saving || index === refs.length - 1}
                              onClick={() => updateChannel(kind, moveItem(refs, index, index + 1))}
                              className="rounded-md p-1 text-[10px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                              aria-label="下移"
                            >
                              <i className="fa-solid fa-arrow-down" />
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => updateChannel(kind, refs.filter((item) => item !== ref))}
                              className="rounded-md p-1 text-[10px] text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                              aria-label="移出首页"
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })
                ) : (
                  <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-[12px] text-zinc-400">
                    未选择内容，首页此栏将显示「暂无上架内容」
                  </li>
                )}
              </ol>

              {canManage ? (
                <div className="mt-auto border-t border-zinc-100 p-2.5">
                  <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                    添加到首页
                    {kind === 'projects' ? '（已上架的 Skill / Agent）' : '（已上架工具）'}
                  </p>
                  <CenterSearchInput
                    value={searchByKind[kind]}
                    onChange={(value) => setSearchByKind((prev) => ({ ...prev, [kind]: value }))}
                    placeholder="搜索名称或简介…"
                    type="search"
                    className="w-full"
                  />
                  <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                    {available.length ? (
                      available.map((card) => (
                        <li
                          key={homeFeaturedCardRef(card)}
                          className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-zinc-50"
                        >
                          <ToolLogo
                            name={card.title}
                            logoUrl={card.logoUrl}
                            icon={card.icon}
                            size={22}
                            className="rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] text-zinc-700">{card.title}</p>
                            {kind === 'projects' ? (
                              <p className="text-[10px] text-zinc-400">{cardSubtitle(card)}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            disabled={saving || full}
                            onClick={() => updateChannel(kind, [...refs, homeFeaturedCardRef(card)])}
                            className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                            title={full ? `每栏最多 ${HOME_FEATURED_MAX_PER_CHANNEL} 项` : undefined}
                          >
                            添加
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-1.5 py-3 text-center text-[11px] text-zinc-400">
                        {keyword ? '没有匹配的内容' : '没有可添加的内容'}
                      </li>
                    )}
                  </ul>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
