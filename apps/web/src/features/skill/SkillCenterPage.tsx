import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { ASSET_VISIBILITY_LABELS, getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { SkillEditorModal, type SkillEditorTarget } from '@/components/center/SkillEditorModal';
import { SkillAvatar } from '@/components/brand/SkillAvatar';
import { downloadAllSkillsFile, downloadSkillFile } from '@/domain/skillExport';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAppViewStore } from '@/stores/appViewStore';

interface SkillCenterPageProps {
  onInvoke: (skill: PrototypeSkillSeed) => void;
}

export function SkillCenterPage({ onInvoke }: SkillCenterPageProps) {
  const {
    skills,
    skillFilter,
    skillSearch,
    setSkillFilter,
    setSkillSearch,
    skillDeptFilter,
    skillRegionFilter,
    skillScopeFilter,
    setSkillDeptFilter,
    setSkillRegionFilter,
    setSkillScopeFilter,
    filteredSkills,
    bumpSkillInvokes,
    importSkillFile,
    showToast,
  } = useMarketplaceStore();
  const setAppView = useAppViewStore((s) => s.setAppView);

  const [detail, setDetail] = useState<PrototypeSkillSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<SkillEditorTarget>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const list = filteredSkills();

  const stats = useMemo(() => {
    const pub = skills.filter((s) => s.published).length;
    const office = skills.filter((s) => s.category === 'office').length;
    const totalInvokes = skills.reduce((n, s) => n + s.invokes, 0);
    return [
      ['Skill 总数', skills.length],
      ['已发布', pub],
      ['办公提效', office],
      ['总调用', totalInvokes.toLocaleString()],
    ] as [string, string | number][];
  }, [skills]);

  const handleInvoke = (skill: PrototypeSkillSeed) => {
    bumpSkillInvokes(skill.id);
    if (skill.sourceType === 'external' && skill.homepageUrl) {
      window.open(skill.homepageUrl, '_blank', 'noopener,noreferrer');
      showToast(`已打开外部能力：${skill.name}`);
      return;
    }
    onInvoke(skill);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.skill.zip,.md,.skill.md,.json,.skill.json,application/zip,application/json,text/markdown"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void (async () => {
            const imported = await importSkillFile(file);
            if (imported[0]) {
              // 导入是「新建」到列表，不是挂到某个已有技能下
              setSkillScopeFilter('mine');
              setSkillSearch(imported[0].name);
              setDetail(imported[0]);
            }
          })();
          e.target.value = '';
        }}
      />
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="技能"
          subtitle="能力资产 · 按职能/区域上架共享 · 团队调用"
          tip={
            <>
              Skill 可按 NP 与区域归属上架。下载为 Skill 包（含 SKILL.md、reference、templates、assets）；也可导入
              ZIP / SKILL.md / JSON。输入 <code className="rounded bg-black/[0.04] px-1">/skill名</code> 在任务中心调用。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={skillSearch} onChange={setSkillSearch} placeholder="搜索 Skill…" />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                >
                  更多
                  <i className="fa-solid fa-chevron-down ml-1 text-[9px]" />
                </button>
                {moreOpen ? (
                  <div className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAppView('tools');
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                    >
                      <i className="fa-solid fa-plug w-3.5 text-[10px] text-zinc-400" />
                      工具
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        importInputRef.current?.click();
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                      title="导入为新技能（不挂到某个已有技能下），成功后打开详情"
                    >
                      <i className="fa-solid fa-file-import w-3.5 text-[10px] text-zinc-400" />
                      导入 Skill 包
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadAllSkillsFile(skills);
                        showToast(`已导出 ${skills.length} 个 Skill 清单（JSON 备份）`);
                        setMoreOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-700 hover:bg-zinc-50"
                    >
                      <i className="fa-solid fa-file-export w-3.5 text-[10px] text-zinc-400" />
                      导出全部清单
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setEditorTarget('new')}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
              >
                <i className="fa-solid fa-plus mr-1" />
                创建技能
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <OrgAssetFilterBar
          deptFilter={skillDeptFilter}
          regionFilter={skillRegionFilter}
          efficiencyFilter={skillFilter === 'experience' ? 'all' : skillFilter}
          scopeFilter={skillScopeFilter}
          onDeptChange={setSkillDeptFilter}
          onRegionChange={setSkillRegionFilter}
          onEfficiencyChange={(id) => setSkillFilter(id)}
          onScopeChange={setSkillScopeFilter}
          showScope
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.length ? (
            list.map((s) => (
              <div key={s.id} className="market-card apple-card flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <SkillAvatar skillId={s.id} icon={s.icon} size={36} title={s.name} />
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        s.published
                          ? 'border border-zinc-200 bg-claw-50 text-zinc-700'
                          : 'bg-black/[0.04] text-[#86868b]',
                      )}
                    >
                      {s.published ? '已发布' : '草稿'}
                    </span>
                    {s.sourceType === 'external' && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                        外部
                      </span>
                    )}
                    {s.instructions && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                        可对话执行
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-claw-600">{getEfficiencyLabel(s.category)}</span>
                <h3 className="text-[13px] font-semibold text-zinc-900">{s.name}</h3>
                <p className="mt-1 flex-1 text-[11px] text-zinc-500">{s.desc}</p>
                <p className="mono mt-1.5 text-[10px] text-zinc-600">{s.command}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {(s.ownerDeptIds ?? []).slice(0, 2).map(getDeptLabel).join(' · ') || '未指定职能'}
                  {s.ownerRegionId ? ` · ${getRegionLabel(s.ownerRegionId)}` : ''}
                  {' · '}
                  {ASSET_VISIBILITY_LABELS[s.visibility ?? 'public']}
                </p>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  v{s.version} · {s.connector} · {s.invokes} 次
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] text-[#1d1d1f]">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-black/[0.04] pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleInvoke(s)}
                    className="apple-btn-primary flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition"
                  >
                    调用
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadSkillFile(s);
                      showToast(`已下载 Skill 包 ${s.name}.skill.zip`);
                    }}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                    title="下载 Skill 包（SKILL.md + reference/templates/assets）"
                  >
                    <i className="fa-solid fa-download" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(s)}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    详情
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(s.id)}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    编辑
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="apple-card col-span-3 p-8 text-center text-[#86868b]">未找到匹配的 Skill</div>
          )}
        </div>
      </div>

      <CenterModal
        open={!!detail}
        title={detail?.name ?? ''}
        onClose={() => setDetail(null)}
        actions={
          detail && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleInvoke(detail);
                  setDetail(null);
                }}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
              >
                调用
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = detail.id;
                  setDetail(null);
                  setEditorTarget(id);
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                编辑
              </button>
              <button type="button" onClick={() => setDetail(null)} className="rounded-xl border border-black/8 px-4 py-2 text-[12px]">
                关闭
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-3 text-[13px]">
            <p className="text-[#86868b]">{detail.desc}</p>
            <p className="mono text-claw-600">{detail.command}</p>
            <p className="text-[11px] text-[#86868b]">
              {getEfficiencyLabel(detail.category)} · v{detail.version} · {detail.connector}
              {detail.ownerRegionId ? ` · ${getRegionLabel(detail.ownerRegionId)}` : ''}
            </p>
            {detail.instructions ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-sky-800">Skill 正文（对话执行时注入）</p>
                <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-700">
                  {detail.instructions}
                </pre>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-[11px] text-zinc-500">
                尚未配置 Skill 正文。点击「编辑」可补充，保存后即可对话执行。
              </p>
            )}
            {detail.planSteps?.length ? (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">默认执行计划</p>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] text-zinc-600">
                  {detail.planSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        )}
      </CenterModal>

      <SkillEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
