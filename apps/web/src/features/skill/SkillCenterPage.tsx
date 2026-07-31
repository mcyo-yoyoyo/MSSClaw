import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { ASSET_VISIBILITY_LABELS, getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import { SKILL_VISIBILITY_SCOPE_OPTIONS } from '@/domain/assetFilters';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  StatCardGrid,
} from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { SkillEditorModal, type SkillEditorTarget } from '@/components/center/SkillEditorModal';
import { downloadAllSkillsFile, downloadSkillFile } from '@/domain/skillExport';
import { skillDisplayDesc, skillDisplayName } from '@/domain/skillDisplay';
import { resolveSkillAccentColor } from '@/domain/skillAccent';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface SkillCenterPageProps {
  onInvoke: (skill: PrototypeSkillSeed) => void;
}

export function SkillCenterPage({ onInvoke }: SkillCenterPageProps) {
  const {
    skills,
    skillSearch,
    setSkillSearch,
    skillDeptFilter,
    skillRegionFilter,
    skillScopeFilter,
    setSkillDeptFilter,
    setSkillRegionFilter,
    setSkillScopeFilter,
    filteredSkills,
    bumpSkillInvokes,
    showToast,
  } = useMarketplaceStore();

  const [detail, setDetail] = useState<PrototypeSkillSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<SkillEditorTarget>(null);
  const list = filteredSkills();

  const stats = useMemo(() => {
    const pub = skills.filter((s) => s.published).length;
    const orgVis = skills.filter((s) => (s.visibility ?? 'org') === 'org').length;
    const totalInvokes = skills.reduce((n, s) => n + s.invokes, 0);
    return [
      ['Skill 总数', skills.length],
      ['可调用', pub],
      ['本组织可见', orgVis],
      ['总调用', totalInvokes.toLocaleString()],
    ] as [string, string | number][];
  }, [skills]);

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
          title="配置技能"
          subtitle="优先上传 Skill 包解析 · 默认组织内沉淀 · 上架可调用 / 公开可见需审批"
          tip={
            <>
              参照 Skill Hub：上传标准包 → 配置中英文与标签 → 组织内沉淀。公开跨部门或上架可调用模型任务时触发评审。
              1.0 不打通连接器。输入 <code className="rounded bg-black/[0.04] px-1">/skill名</code> 调用已上架技能。
            </>
          }
          actions={
            <>
              <CenterSearchInput value={skillSearch} onChange={setSkillSearch} placeholder="搜索 Skill…" />
              <button
                type="button"
                onClick={() => {
                  try {
                    downloadAllSkillsFile(skills);
                    const totalInvokes = skills.reduce((n, s) => n + (s.invokes || 0), 0);
                    showToast(
                      `已导出 Excel：${skills.length} 个 Skill（含调用 ${totalInvokes.toLocaleString()} 次）`,
                    );
                  } catch (err) {
                    console.error(err);
                    showToast('导出 Excel 失败，请重试或检查浏览器下载权限');
                  }
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
                title="导出含调用次数、上架与可见状态的运营分析清单"
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
                创建技能
              </button>
            </>
          }
        />

        <StatCardGrid items={stats} />

        <OrgAssetFilterBar
          deptFilter={skillDeptFilter}
          regionFilter={skillRegionFilter}
          scopeFilter={skillScopeFilter}
          scopeOptions={SKILL_VISIBILITY_SCOPE_OPTIONS}
          onDeptChange={setSkillDeptFilter}
          onRegionChange={setSkillRegionFilter}
          onScopeChange={setSkillScopeFilter}
          showScope
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {list.length ? (
            list.map((s) => {
              const accent = resolveSkillAccentColor(s.accentColor);
              const creator = s.author || s.publisher || '未知';
              return (
                <div
                  key={s.id}
                  className="market-card apple-card flex flex-col px-3 py-2.5"
                  style={{ borderLeft: `3px solid ${accent}` }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: accent }}
                      title="标识色"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[13px] font-semibold leading-tight text-zinc-900">
                          {skillDisplayName(s)}
                        </h3>
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold',
                            s.published
                              ? 'bg-claw-50 text-claw-700'
                              : 'bg-zinc-100 text-zinc-500',
                          )}
                        >
                          {s.published ? '可调用' : '已沉淀'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                        创建人 {creator}
                        <span className="mx-1 text-zinc-300">·</span>
                        <span className="mono text-zinc-600">{s.command}</span>
                        <span className="mx-1 text-zinc-300">·</span>
                        v{s.version}
                        <span className="mx-1 text-zinc-300">·</span>
                        {s.invokes} 次
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                        {skillDisplayDesc(s) || '暂无描述'}
                      </p>
                      <p className="mt-1 truncate text-[10px] text-zinc-400">
                        {(s.ownerDeptIds ?? []).slice(0, 2).map(getDeptLabel).join(' · ') || '未指定职能'}
                        {s.ownerRegionId ? ` · ${getRegionLabel(s.ownerRegionId)}` : ''}
                        {' · '}
                        {ASSET_VISIBILITY_LABELS[s.visibility ?? 'org']}
                      </p>
                      {[...(s.tags ?? []), ...(s.searchKeywords ?? [])].length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {[...(s.tags ?? []), ...(s.searchKeywords ?? [])].slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] text-zinc-600"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5 border-t border-black/[0.04] pt-2">
                    <button
                      type="button"
                      onClick={() => handleInvoke(s)}
                      className="apple-btn-primary flex-1 rounded-md py-1 text-[11px] font-semibold text-white transition"
                    >
                      调用
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        downloadSkillFile(s);
                        showToast(`已下载 Skill 包 ${skillDisplayName(s)}.skill.zip`);
                      }}
                      className="rounded-md border border-black/8 px-2 py-1 text-[11px] font-medium transition hover:bg-black/[0.03]"
                      title="下载 Skill 包"
                    >
                      <i className="fa-solid fa-download" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetail(s)}
                      className="rounded-md border border-black/8 px-2 py-1 text-[11px] font-medium transition hover:bg-black/[0.03]"
                    >
                      详情
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTarget(s.id)}
                      className="rounded-md border border-black/8 px-2 py-1 text-[11px] font-medium transition hover:bg-black/[0.03]"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="apple-card col-span-3 p-6 text-center text-[13px] text-[#86868b]">
              未找到匹配的 Skill
            </div>
          )}
        </div>
      </div>

      <CenterModal
        open={!!detail}
        title={detail ? skillDisplayName(detail) : ''}
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
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                关闭
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-3 text-[13px]">
            <p className="text-[11px] text-zinc-500">
              创建人：
              <span className="font-semibold text-zinc-800">{detail.author || detail.publisher || '未知'}</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              发布方：
              <span className="font-semibold text-zinc-800">{detail.publisher || detail.author || '未知'}</span>
            </p>
            <p className="text-[#86868b]">{skillDisplayDesc(detail)}</p>
            <p className="mono text-claw-600">{detail.command}</p>
            <p className="text-[11px] text-[#86868b]">
              v{detail.version}
              {detail.ownerRegionId ? ` · ${getRegionLabel(detail.ownerRegionId)}` : ''}
              {' · '}
              {ASSET_VISIBILITY_LABELS[detail.visibility ?? 'org']}
              {' · '}
              {detail.invokes} 次调用
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
