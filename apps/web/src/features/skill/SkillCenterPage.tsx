import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import {
  CenterModal,
  CenterPageHeader,
  CenterSearchInput,
  EfficiencyFilterChips,
  LearningCallout,
  StatCardGrid,
} from '@/components/center/CenterShell';
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
    filteredSkills,
    bumpSkillInvokes,
    importSkillFile,
    showToast,
  } = useMarketplaceStore();
  const setAppView = useAppViewStore((s) => s.setAppView);

  const [detail, setDetail] = useState<PrototypeSkillSeed | null>(null);
  const [editorTarget, setEditorTarget] = useState<SkillEditorTarget>(null);
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
    onInvoke(skill);
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.skill.json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importSkillFile(file);
          e.target.value = '';
        }}
      />
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="Skill 中心"
          subtitle="能力资产 · 挂载编排 · 团队共享调用"
          actions={
            <>
              <CenterSearchInput value={skillSearch} onChange={setSkillSearch} placeholder="搜索 Skill…" />
              <button
                type="button"
                onClick={() => setAppView('tools')}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                <i className="fa-solid fa-plug mr-1" />
                管理连接器
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                <i className="fa-solid fa-file-import mr-1" />
                导入 Skill
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadAllSkillsFile(skills);
                  showToast(`已导出 ${skills.length} 个 Skill`);
                }}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
              >
                <i className="fa-solid fa-file-export mr-1" />
                导出全部
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

        <LearningCallout icon="fa-cube">
          <strong>快速上手：</strong>
          Skill 是可复用的能力单元，可挂载 Tool 连接器。输入 <code className="rounded bg-black/[0.04] px-1">/skill名</code> 在任务中心调用，或在 Skill 编辑页绑定 Prompt 与 Tool。
        </LearningCallout>

        <EfficiencyFilterChips value={skillFilter} onChange={(id) => setSkillFilter(id as typeof skillFilter)} />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.length ? (
            list.map((s) => (
              <div key={s.id} className="market-card apple-card flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <SkillAvatar skillId={s.id} icon={s.icon} size={36} title={s.name} />
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
                </div>
                <span className="text-[10px] font-semibold text-claw-600">{getEfficiencyLabel(s.category)}</span>
                <h3 className="text-[13px] font-semibold text-zinc-900">{s.name}</h3>
                <p className="mt-1 flex-1 text-[11px] text-zinc-500">{s.desc}</p>
                <p className="mono mt-1.5 text-[10px] text-zinc-600">{s.command}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
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
                      showToast(`已下载 ${s.name}.skill.json`);
                    }}
                    className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                    title="下载"
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
            </p>
          </div>
        )}
      </CenterModal>

      <SkillEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
