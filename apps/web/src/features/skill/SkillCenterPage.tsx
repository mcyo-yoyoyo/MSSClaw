import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import {
  getDeptLabel,
  getRegionLabel,
  HQ_DEPTS,
  REGIONS,
} from '@/domain/orgTaxonomy';
import { SKILL_VISIBILITY_SCOPE_OPTIONS } from '@/domain/assetFilters';
import {
  listVisibleBusinessScenarioCategories,
} from '@/domain/businessScenarios';
import { resolveSkillBusinessScenario, getSkillBusinessLabel } from '@/domain/skillBusinessScenarios';
import {
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { SkillEditorModal, type SkillEditorTarget } from '@/components/center/SkillEditorModal';
import {
  SkillOpsRequestModal,
  type SkillOpsRequestKind,
} from '@/components/center/SkillOpsRequestModal';
import { SharedCatalogEmptyHint } from '@/components/common/SharedCatalogEmptyHint';
import { MarketShelfCard } from '@/components/market/MarketShelfCard';
import { MarketSkillDetailModal } from '@/features/market/MarketSkillDetailModal';
import type { MarketShelfCard as MarketShelfCardModel } from '@/domain/marketShelf';
import { downloadAllSkillsFile, downloadSkillFile } from '@/domain/skillExport';
import { skillDisplayDesc, skillDisplayName } from '@/domain/skillDisplay';
import {
  findHomogenizationHits,
  homogenizationWarningCount,
} from '@/domain/skillHomogenization';
import {
  getSecurityScanGateMode,
  setSecurityScanGateMode,
  type SkillSecurityScanGateMode,
} from '@/domain/skillSecurityScan';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useSkillReviewStore } from '@/stores/skillReviewStore';
import { useAppViewStore } from '@/stores/appViewStore';

type DistTab = 'dept' | 'region' | 'scene' | 'homo';
type DistSort = 'original' | 'asc' | 'desc';

interface SkillCenterPageProps {
  onInvoke: (skill: PrototypeSkillSeed) => void;
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function skillMonthStamp(s: PrototypeSkillSeed): string | null {
  const raw = s.createdAt || s.updatedAt || null;
  if (!raw || raw === '—') return null;
  const m = String(raw).match(/^(\d{4}-\d{2})/);
  return m?.[1] ?? null;
}

export function SkillCenterPage({ onInvoke }: SkillCenterPageProps) {
  const {
    skills,
    skillSearch,
    setSkillSearch,
    skillDeptFilter,
    skillRegionFilter,
    skillScopeFilter,
    skillBusinessFilter,
    setSkillDeptFilter,
    setSkillRegionFilter,
    setSkillScopeFilter,
    setSkillBusinessFilter,
    filteredSkills,
    bumpSkillInvokes,
    showToast,
  } = useMarketplaceStore();
  const hydrateBusinessCatalog = useBusinessScenarioCatalogStore((s) => s.hydrate);
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const hydrateReviews = useSkillReviewStore((s) => s.hydrate);
  const setAppView = useAppViewStore((s) => s.setAppView);
  void engagementById;

  useEffect(() => {
    hydrateBusinessCatalog();
    hydrateReviews();
  }, [hydrateBusinessCatalog, hydrateReviews]);

  const [detail, setDetail] = useState<PrototypeSkillSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<SkillEditorTarget>(null);
  const [opsRequest, setOpsRequest] = useState<{
    skill: PrototypeSkillSeed;
    kind: SkillOpsRequestKind;
  } | null>(null);
  const [distTab, setDistTab] = useState<DistTab>('dept');
  const [distSort, setDistSort] = useState<DistSort>('original');
  const [scanGate, setScanGate] = useState<SkillSecurityScanGateMode>(() => getSecurityScanGateMode());
  useEffect(() => {
    setScanGate(getSecurityScanGateMode());
  }, []);
  const list = filteredSkills();

  const stats = useMemo(() => {
    const total = skills.length;
    const publicCount = skills.filter((s) => (s.visibility ?? 'public') === 'public').length;
    const scopedCount = skills.filter((s) => (s.visibility ?? 'public') !== 'public').length;
    const thisMonth = monthKey();
    const monthNew = skills.filter((s) => skillMonthStamp(s) === thisMonth).length;
    const homo = homogenizationWarningCount(skills);
    return [
      ['Skill 总数', total],
      ['公开 Skill', publicCount],
      ['领域权限 Skill', scopedCount],
      ['本月新增', monthNew],
      ['同质化预警', homo],
    ] as [string, string | number][];
  }, [skills]);

  const homoHits = useMemo(() => findHomogenizationHits(skills), [skills]);

  const distRows = useMemo(() => {
    if (distTab === 'homo') return [];
    if (distTab === 'dept') {
      return HQ_DEPTS.map((d) => ({
        id: d.id,
        label: d.label,
        count: skills.filter((s) => (s.ownerDeptIds ?? []).includes(d.id)).length,
      }));
    }
    if (distTab === 'region') {
      return REGIONS.map((r) => ({
        id: r.id,
        label: r.label,
        count: skills.filter((s) => s.ownerRegionId === r.id).length,
      }));
    }
    return listVisibleBusinessScenarioCategories().map((c) => ({
      id: c.id,
      label: c.label,
      count: skills.filter((s) => resolveSkillBusinessScenario(s) === c.id).length,
    }));
  }, [distTab, skills]);

  const maxDist = Math.max(1, 0, ...distRows.map((r) => r.count));
  const sortedDistRows = useMemo(() => {
    if (distSort === 'original') return distRows;
    return [...distRows].sort((a, b) =>
      distSort === 'asc' ? a.count - b.count : b.count - a.count,
    );
  }, [distRows, distSort]);

  const listCards = useMemo((): { skill: PrototypeSkillSeed; card: MarketShelfCardModel }[] => {
    return list.map((s) => {
      const bizLabel = getSkillBusinessLabel(s);
      const eng = getEngagement(s.id);
      const badges: MarketShelfCardModel['badges'] = [];
      if (s.ownerDeptIds?.[0]) {
        badges.push({ label: getDeptLabel(s.ownerDeptIds[0]), tone: 'dept' });
      }
      if (s.ownerRegionId) {
        badges.push({ label: getRegionLabel(s.ownerRegionId), tone: 'region' });
      }
      if (bizLabel) badges.push({ label: bizLabel, tone: 'type' });
      return {
        skill: s,
        card: {
          id: s.id,
          kind: 'projects',
          title: skillDisplayName(s),
          description: skillDisplayDesc(s).replace(/^【[^】]+】/, '').trim() || '暂无描述',
          outcomeHint: skillDisplayDesc(s).replace(/^【[^】]+】/, '').trim() || skillDisplayName(s),
          sceneTags: bizLabel ? [bizLabel] : undefined,
          securityLevel: 'mss',
          icon: s.icon || 'fa-cube',
          logoUrl: s.iconUrl,
          badges,
          featured: Boolean(s.published),
          heat: s.invokes ?? 0,
          likes: eng.likes,
          dislikes: eng.dislikes,
          downloads: eng.downloads,
          scopeBadge: (s.visibility ?? 'public') === 'public' ? 'public' : 'scoped',
          hasHowto: Boolean(s.instructions || s.command),
          runnable: Boolean(s.published && (s.instructions || s.command)),
          primaryAction: 'detail',
        },
      };
    });
  }, [list, getEngagement, engagementById]);

  const handleInvoke = (skill: PrototypeSkillSeed) => {
    if (!skill.published) {
      showToast('该技能尚未上架可调用，请先申请上架审批');
      setEditorTarget(skill.id);
      return;
    }
    bumpSkillInvokes(skill.id);
    if (skill.sourceType === 'external' && skill.homepageUrl) {
      window.open(skill.homepageUrl, '_blank', 'noopener,noreferrer');
      showToast(`已打开外部能力：${skillDisplayName(skill)}`);
      return;
    }
    onInvoke(skill);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="配置Skill"
          subtitle="运营看板 · 多维筛选 · 与集市统一的 Skill 卡片 · 上架可调用需审批"
          tip={
            <>
              上传标准包 → 配置中英文与标签 → 设置发布权限范围。上架可调用模型任务时触发评审。安全扫描模块已预留（待对接
              IT）。输入 <code className="rounded bg-black/[0.04] px-1">/skill名</code> 调用已上架技能。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={skillSearch} onChange={setSkillSearch} placeholder="搜索 Skill…" />
              <button
                type="button"
                onClick={() => {
                  try {
                    const engMap = Object.fromEntries(
                      skills.map((s) => {
                        const e = getEngagement(s.id);
                        return [s.id, { likes: e.likes, dislikes: e.dislikes, downloads: e.downloads }];
                      }),
                    );
                    downloadAllSkillsFile(skills, engMap);
                    showToast(`已导出 Excel：${skills.length} 个 Skill（调用/Token 列预留为 —）`);
                  } catch (err) {
                    console.error(err);
                    showToast('导出 Excel 失败，请重试或检查浏览器下载权限');
                  }
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                title="导出运营分析清单"
              >
                <i className="fa-solid fa-file-export mr-1 text-[10px] text-zinc-400" />
                导出全部清单
              </button>
              <button
                type="button"
                onClick={() => setEditorTarget('new')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
              >
                <i className="fa-solid fa-plus mr-1" />
                创建 Skill
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <section className="mb-4 rounded-2xl border border-zinc-200/90 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold text-zinc-800">多维度分布看板</h3>
            <div className="flex items-center gap-2">
              {distTab !== 'homo' ? (
                <button
                  type="button"
                  onClick={() => setDistSort((value) => value === 'original' ? 'asc' : value === 'asc' ? 'desc' : 'original')}
                  className="flex flex-col items-center rounded-md px-1.5 py-0.5 leading-none hover:bg-zinc-100"
                  title="切换排序：原排序 → 升序 → 降序"
                  aria-label="切换看板排序"
                >
                  <span className={distSort === 'asc' ? 'text-sky-600' : 'text-zinc-300'}>▲</span>
                  <span className={distSort === 'desc' ? 'text-sky-600' : 'text-zinc-300'}>▼</span>
                </button>
              ) : null}
              <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100/80 p-0.5">
              {(
                [
                  ['dept', '领域'],
                  ['region', '区域'],
                  ['scene', '业务场景'],
                  ['homo', '同质化'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDistTab(id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                    distTab === id
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800',
                  )}
                >
                  {label}
                  {id === 'homo' && homoHits.length ? (
                    <span className="ml-1 text-amber-700">({homoHits.length})</span>
                  ) : null}
                </button>
              ))}
              </div>
            </div>
          </div>
          {distTab === 'homo' ? (
            <div className="space-y-2">
              {homoHits.length ? (
                homoHits.slice(0, 12).map((h) => (
                  <div
                    key={`${h.skillId}-${h.peerId}`}
                    className="relative rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5"
                  >
                    <span className="absolute right-3 top-2.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                      {h.similarity}%
                    </span>
                    <p className="pr-14 text-[12px] font-semibold text-zinc-800">
                      {h.skillName}
                      <span className="mx-1.5 font-normal text-zinc-400">vs</span>
                      {h.peerName}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      重叠：{h.overlap.join(' · ') || '标签/场景相近'}
                    </p>
                    <p className="mt-1 text-[11px] text-amber-900/80">{h.suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-[12px] text-zinc-400">
                  当前无达到阈值的同质化预警（规则相似度，非模型）
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDistRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[110px_minmax(0,1fr)_40px] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
                >
                  <span className="truncate text-left text-[12px] font-medium text-zinc-700">{row.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-zinc-800/80 transition-[width]"
                      style={{ width: `${Math.round((row.count / maxDist) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums text-[12px] font-semibold text-zinc-900">{row.count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
            <p className="text-[10px] text-zinc-400">
              安全扫描门禁：{scanGate === 'off' ? '关闭（默认）' : scanGate === 'warn' ? '告警' : '拦截'}
              · 对接 IT 后可切 block
            </p>
            <div className="flex flex-wrap gap-1">
              {(['off', 'warn', 'block'] as SkillSecurityScanGateMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setSecurityScanGateMode(m);
                    setScanGate(m);
                    showToast(
                      m === 'off'
                        ? '安全扫描门禁已关闭'
                        : m === 'warn'
                          ? '门禁=告警：未通过仍可提交'
                          : '门禁=拦截：未通过禁止上架/更新审批',
                    );
                  }}
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                    scanGate === m
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                  )}
                >
                  {m}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAppView('approvals')}
                className="rounded-md border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700"
              >
                审批中心
              </button>
            </div>
          </div>
        </section>

        <OrgAssetFilterBar
          deptFilter={skillDeptFilter}
          regionFilter={skillRegionFilter}
          businessFilter={skillBusinessFilter}
          scopeFilter={skillScopeFilter}
          scopeOptions={SKILL_VISIBILITY_SCOPE_OPTIONS}
          onDeptChange={setSkillDeptFilter}
          onRegionChange={setSkillRegionFilter}
          onBusinessChange={setSkillBusinessFilter}
          onScopeChange={setSkillScopeFilter}
          showScope
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {listCards.length ? (
            listCards.map(({ skill: s, card }) => (
              <div key={s.id}>
                <MarketShelfCard
                  card={card}
                  primaryLabel="详情"
                  onOpen={() => setDetail(s)}
                  onPrimary={() => setDetail(s)}
                  footerActions={
                    <div className="grid grid-cols-5 gap-1.5">
                      <button type="button" onClick={() => handleInvoke(s)} className="rounded-lg bg-zinc-900 py-1.5 text-[10px] font-semibold text-white">调用</button>
                      <button type="button" onClick={() => { downloadSkillFile(s); showToast(`已下载 Skill 包 ${skillDisplayName(s)}.skill.zip`); }} className="rounded-lg bg-zinc-100 py-1.5 text-[10px] font-medium text-zinc-600">下载</button>
                      <button type="button" onClick={() => setEditorTarget(s.id)} className="rounded-lg bg-zinc-100 py-1.5 text-[10px] font-medium text-zinc-600">编辑</button>
                      <button type="button" onClick={() => setOpsRequest({ skill: s, kind: 'update' })} className="rounded-lg bg-sky-50 py-1.5 text-[10px] font-medium text-sky-900">更新</button>
                      <button type="button" onClick={() => setOpsRequest({ skill: s, kind: 'unpublish' })} className="rounded-lg bg-amber-50 py-1.5 text-[10px] font-medium text-amber-900">下架</button>
                    </div>
                  }
                />
              </div>
            ))
          ) : (
            <SharedCatalogEmptyHint assetLabel="Skill" />
          )}
        </div>
      </div>

      {detail ? (
        <MarketSkillDetailModal
          skill={detail}
          canRun={Boolean(detail.published)}
          onClose={() => setDetail(null)}
          onRun={(s) => {
            handleInvoke(s);
            setDetail(null);
          }}
          onToast={showToast}
          adminActions={{
            onUpdateRequest: () => {
              setOpsRequest({ skill: detail, kind: 'update' });
            },
            onUnpublishRequest: () => {
              setOpsRequest({ skill: detail, kind: 'unpublish' });
            },
          }}
        />
      ) : null}

      <SkillOpsRequestModal
        skill={opsRequest?.skill ?? null}
        kind={opsRequest?.kind ?? null}
        onClose={() => setOpsRequest(null)}
      />

      <SkillEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
