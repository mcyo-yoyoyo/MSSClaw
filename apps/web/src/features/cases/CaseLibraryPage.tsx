import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  LearningCallout,
  StatCardGrid,
} from '@/components/center/CenterShell';
import {
  PORTAL_CONTENT_TYPE_LABELS,
  type PortalContentItem,
} from '@/domain/prototype/portalContent';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { canViewAsset } from '@/domain/assetVisibility';
import { DocumentPreviewPanel } from '@/components/center/DocumentPreviewPanel';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';

const CASE_TYPES: PortalContentItem['type'][] = ['case', 'insight', 'training', 'news'];

export function CaseLibraryPage() {
  const items = usePortalContentStore((s) => s.items);
  const user = useSessionStore((s) => s.user);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const consumeCaseId = useNavigationIntentStore((s) => s.consumeCaseId);
  const pendingCaseId = useNavigationIntentStore((s) => s.pendingCaseId);
  const showToast = usePortalContentStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PortalContentItem['type']>('all');
  const [detail, setDetail] = useState<PortalContentItem | null>(null);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!CASE_TYPES.includes(item.type)) return false;
      if (item.published === false) return false;
      if (
        !canViewAsset(item, {
          userId: user?.id,
          userName: user?.name,
          affiliation,
          role: user?.platformRole,
        })
      ) {
        return false;
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!q) return true;
      return `${item.title} ${item.desc} ${(item.scenarioTags ?? []).join(' ')}`
        .toLowerCase()
        .includes(q);
    });
  }, [items, search, typeFilter, user, affiliation]);

  useEffect(() => {
    if (!pendingCaseId) return;
    // bootstrap 未完成时先不消费，避免深链丢失
    if (items.length === 0) return;
    const id = consumeCaseId();
    if (!id) return;
    const allowed = visible.find((i) => i.id === id);
    if (allowed) {
      setSearch('');
      setDetail(allowed);
      return;
    }
    if (items.some((i) => i.id === id)) showToast('该案例对当前角色不可见');
    else showToast(`未找到案例：${id}`);
  }, [pendingCaseId, items, visible, consumeCaseId, showToast]);

  const stats = useMemo(
    () =>
      [
        ['内容总数', visible.length],
        ['案例', visible.filter((i) => i.type === 'case').length],
        ['洞察', visible.filter((i) => i.type === 'insight').length],
        ['培训', visible.filter((i) => i.type === 'training').length],
      ] as [string, string | number][],
    [visible],
  );

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="案例库"
          subtitle="案例 · 洞察 · 培训 · 讯息 · 一线可发现的赋能内容"
          actions={
            <>
              <CenterSearchInput value={search} onChange={setSearch} placeholder="搜索案例…" />
              <button
                type="button"
                onClick={() => setAppView('ai-map')}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                场景地图
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <LearningCallout icon="fa-lightbulb">
          <strong>说明：</strong>
          内容由门户运营上架；点击条目查看详情。关联知识 / 工具可从详情跳转。
        </LearningCallout>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', typeFilter === 'all' && 'active')}
          >
            全部
          </button>
          {CASE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={cn('filter-chip px-2.5 py-1 text-[11px] font-medium', typeFilter === t && 'active')}
            >
              {PORTAL_CONTENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDetail(item)}
              className="apple-card flex flex-col gap-2 p-4 text-left transition hover:border-zinc-300 hover:shadow-apple"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-white">
                  <i className={cn('fa-solid text-[11px]', item.icon)} />
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                  {PORTAL_CONTENT_TYPE_LABELS[item.type]}
                </span>
              </div>
              <h3 className="text-[13px] font-semibold text-zinc-900">{item.title}</h3>
              <p className="line-clamp-2 text-[11px] text-zinc-500">{item.desc}</p>
              <p className="mt-auto text-[10px] text-zinc-400">
                {(item.ownerDeptIds ?? []).map(getDeptLabel).join(' · ') || '全员'}
                {item.ownerRegionId ? ` · ${getRegionLabel(item.ownerRegionId)}` : ''}
                {' · '}
                {item.publishedAt}
              </p>
            </button>
          ))}
          {!visible.length && (
            <div className="apple-card col-span-full p-8 text-center text-[12px] text-zinc-500">
              暂无可见案例内容
            </div>
          )}
        </div>
      </div>

      <CenterModal
        open={!!detail}
        title={detail?.title ?? '案例详情'}
        onClose={() => setDetail(null)}
        actions={
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
          >
            关闭
          </button>
        }
      >
        {detail ? (
          <div className="space-y-3 text-left text-[13px]">
            <DocumentPreviewPanel
              meta={{
                title: detail.title,
                typeLabel: PORTAL_CONTENT_TYPE_LABELS[detail.type],
                author: detail.publisher,
                updatedAt: detail.publishedAt,
                pages: 3,
                summary: [
                  detail.desc,
                  detail.scenarioTags?.length
                    ? `\n场景标签：${detail.scenarioTags.join(' · ')}`
                    : '',
                  `\n可见性：${ASSET_VISIBILITY_LABELS[detail.visibility ?? 'public']}`,
                  `\n归属：${(detail.ownerDeptIds ?? []).map(getDeptLabel).join(' · ') || '全员'}`,
                  detail.ownerRegionId ? ` · ${getRegionLabel(detail.ownerRegionId)}` : '',
                ].join(''),
                bodyParagraphs: [
                  detail.desc,
                  `本案例「${detail.title}」已在门户上架，可用于一线赋能与场景地图能力包组装。`,
                  '在线预览为演示排版；若关联知识库文档，可通过下方按钮打开原文。',
                ],
              }}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {detail.kbDocId ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium"
                  onClick={() => {
                    useNavigationIntentStore.getState().focusKbDoc(detail.kbDocId!);
                    setAppView('kb');
                  }}
                >
                  打开关联知识
                </button>
              ) : null}
              {detail.toolId ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium"
                  onClick={() => {
                    useNavigationIntentStore.getState().focusTool(detail.toolId!);
                    setAppView('tools');
                  }}
                >
                  打开关联工具
                </button>
              ) : null}
              {detail.homepageUrl ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium"
                  onClick={() => window.open(detail.homepageUrl, '_blank', 'noopener,noreferrer')}
                >
                  打开外链
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CenterModal>
    </div>
  );
}
