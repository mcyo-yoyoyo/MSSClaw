import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { SkillAvatar } from '@/components/brand/SkillAvatar';
import { CenterModal } from '@/components/center/CenterShell';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { getSkillBusinessLabel } from '@/domain/skillBusinessScenarios';
import { skillDisplayDesc, skillDisplayName } from '@/domain/skillDisplay';
import { downloadSkillFile } from '@/domain/skillExport';
import { getSkillPack } from '@/domain/skills/catalog';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';

type DetailTab = 'overview' | 'guide' | 'body';

function stripCategoryPrefix(text: string): string {
  return (text || '').replace(/^【[^】]+】/, '').trim();
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-[11px] text-zinc-400">{label}</dt>
      <dd className="text-right text-[12px] font-medium text-zinc-700">{value}</dd>
    </div>
  );
}

export function MarketSkillDetailModal({
  skill,
  canRun,
  onClose,
  onRun,
  onToast,
}: {
  skill: PrototypeSkillSeed;
  canRun: boolean;
  onClose: () => void;
  onRun: (skill: PrototypeSkillSeed) => void;
  onToast: (msg: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  void engagementById;
  const eng = getEngagement(skill.id);

  const pack = useMemo(() => getSkillPack(skill.id), [skill.id]);
  const name = skillDisplayName(skill);
  const nameEn = skill.nameEn?.trim() && skill.nameEn !== name ? skill.nameEn.trim() : '';
  const desc = stripCategoryPrefix(skillDisplayDesc(skill));
  const instructions = (skill.instructions || pack?.instructions || '').trim();
  const planSteps = skill.planSteps?.length ? skill.planSteps : pack?.planSteps ?? [];
  const demoPrompt = pack?.demoPrompt?.trim() || '';
  const bizLabel = getSkillBusinessLabel(skill);
  const deptLabel = skill.ownerDeptIds?.[0] ? getDeptLabel(skill.ownerDeptIds[0]) : '';
  const regionLabel = skill.ownerRegionId ? getRegionLabel(skill.ownerRegionId) : '';

  const handleDownload = () => {
    bumpDownload(skill.id);
    downloadSkillFile(skill);
    onToast(`已下载技能包：${name}`);
  };

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: '概览' },
    { id: 'guide', label: '快速上手' },
    { id: 'body', label: 'Skill 正文' },
  ];

  return (
    <CenterModal
      open
      title={name}
      onClose={onClose}
      size="xl"
      header={
        <div className="shrink-0 border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-white px-5 py-4 md:px-6">
          <div className="flex items-start gap-4">
            <SkillAvatar
              skillId={skill.id}
              icon={skill.icon || 'fa-cube'}
              size={56}
              className="shrink-0 rounded-2xl"
              title={name}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[18px] font-semibold tracking-tight text-zinc-900">
                    {name}
                  </h3>
                  {nameEn ? (
                    <p className="mt-0.5 truncate text-[12px] text-zinc-400">{nameEn}</p>
                  ) : null}
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
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-zinc-600">
                {desc || '暂无描述'}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {skill.command ? (
                  <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-white">
                    {skill.command}
                  </span>
                ) : null}
                {bizLabel ? (
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                    {bizLabel}
                  </span>
                ) : null}
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                  {getEfficiencyLabel(skill.category)}
                </span>
                {skill.published ? (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    已上架
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    未上架
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] tabular-nums text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <i className="fa-solid fa-download text-[10px]" />
                  {formatToolInvokes(eng.downloads)} 下载
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="fa-solid fa-thumbs-up text-[10px] text-sky-500/80" />
                  {formatToolInvokes(eng.likes)} 点赞
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="fa-solid fa-bolt text-[10px] text-amber-500/80" />
                  {formatToolInvokes(skill.invokes)} 调用
                </span>
                <span>v{skill.version}</span>
              </div>
            </div>
          </div>
        </div>
      }
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600 transition hover:bg-black/[0.03]"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-semibold text-zinc-800 transition hover:bg-zinc-50"
          >
            <i className="fa-solid fa-download text-[11px]" />
            下载技能包
          </button>
          {canRun ? (
            <button
              type="button"
              onClick={() => onRun(skill)}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
            >
              去执行
            </button>
          ) : null}
        </>
      }
    >
      <div className="grid min-h-[420px] md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-h-0 flex-col border-zinc-100 md:border-r">
          <div className="flex shrink-0 gap-1 border-b border-zinc-100 px-4 pt-3 md:px-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-t-lg px-3.5 py-2 text-[12px] font-semibold transition',
                  tab === t.id
                    ? 'bg-white text-zinc-900 shadow-[inset_0_-2px_0_0_#18181b]'
                    : 'text-zinc-400 hover:text-zinc-700',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
            {tab === 'overview' ? (
              <div className="space-y-5">
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">能力说明</h4>
                  <p className="text-[13px] leading-relaxed text-zinc-600">{desc || '暂无描述'}</p>
                  {skill.descEn && skill.descEn !== desc ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">{skill.descEn}</p>
                  ) : null}
                </section>

                {planSteps.length ? (
                  <section>
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">默认执行计划</h4>
                    <ol className="space-y-2">
                      {planSteps.map((step, i) => (
                        <li
                          key={`${i}-${step}`}
                          className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                            {i + 1}
                          </span>
                          <span className="text-[12px] leading-relaxed text-zinc-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {(skill.tags?.length || skill.searchKeywords?.length) ? (
                  <section>
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">标签与关键词</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(skill.tags ?? []).map((tag) => (
                        <span
                          key={`tag-${tag}`}
                          className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
                        >
                          {tag}
                        </span>
                      ))}
                      {(skill.searchKeywords ?? []).map((kw) => (
                        <span
                          key={`kw-${kw}`}
                          className="rounded-md border border-dashed border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-400"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            {tab === 'guide' ? (
              <div className="space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">调用方式</h4>
                  <p className="text-[12px] leading-relaxed text-zinc-600">
                    在任务对话中输入命令，或从 MSS 集市「去执行」一键启动。
                  </p>
                  {skill.command ? (
                    <code className="mt-3 block rounded-xl bg-zinc-900 px-3 py-2.5 font-mono text-[13px] text-emerald-300">
                      {skill.command}
                    </code>
                  ) : (
                    <p className="mt-2 text-[12px] text-zinc-400">暂未配置命令</p>
                  )}
                </section>

                {demoPrompt ? (
                  <section>
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">推荐演示任务</h4>
                    <pre className="whitespace-pre-wrap rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3 text-[12px] leading-relaxed text-zinc-700">
                      {demoPrompt}
                    </pre>
                  </section>
                ) : null}

                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">上手步骤</h4>
                  <ol className="list-decimal space-y-2 pl-4 text-[12px] leading-relaxed text-zinc-600">
                    <li>确认业务场景与权限范围符合当前任务。</li>
                    <li>下载技能包本地预览，或直接在平台对话中调用。</li>
                    <li>按执行计划核对输出，必要时补充上下文后重跑。</li>
                  </ol>
                </section>
              </div>
            ) : null}

            {tab === 'body' ? (
              instructions ? (
                <div>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">
                    Skill 正文
                    <span className="ml-2 font-normal text-zinc-400">对话执行时注入</span>
                  </h4>
                  <pre className="max-h-[52vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-3 text-[12px] leading-relaxed text-zinc-700">
                    {instructions}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
                  尚未配置 Skill 正文。可在「配置Skill」中补充后，在此查看完整内容。
                </div>
              )
            ) : null}
          </div>
        </div>

        <aside className="flex flex-col gap-4 bg-zinc-50/40 px-4 py-4 md:px-5">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-2.5 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
            >
              <i className="fa-solid fa-download text-[11px]" />
              下载技能包
            </button>
            {canRun ? (
              <button
                type="button"
                onClick={() => onRun(skill)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12px] font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                <i className="fa-solid fa-play text-[10px]" />
                去执行
              </button>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-2 text-center text-[11px] text-zinc-400">
                当前方案仅支持下载学习
              </p>
            )}
          </div>

          <dl className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 divide-y divide-zinc-50">
            <MetaRow label="创建人" value={skill.author || skill.publisher || '未知'} />
            <MetaRow label="发布方" value={skill.publisher || skill.author || undefined} />
            <MetaRow label="连接器" value={skill.connector} />
            <MetaRow label="版本" value={`v${skill.version}`} />
            <MetaRow label="可见性" value={ASSET_VISIBILITY_LABELS[skill.visibility ?? 'public']} />
            <MetaRow label="领域" value={bizLabel || undefined} />
            <MetaRow label="部门" value={deptLabel || undefined} />
            <MetaRow label="区域" value={regionLabel || undefined} />
          </dl>

          <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3">
            <p className="mb-2 text-[11px] font-semibold text-zinc-500">互动数据</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-zinc-900">
                  {formatToolInvokes(eng.downloads)}
                </p>
                <p className="text-[10px] text-zinc-400">下载</p>
              </div>
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-zinc-900">
                  {formatToolInvokes(eng.likes)}
                </p>
                <p className="text-[10px] text-zinc-400">点赞</p>
              </div>
              <div>
                <p className="text-[15px] font-semibold tabular-nums text-zinc-900">
                  {formatToolInvokes(skill.invokes)}
                </p>
                <p className="text-[10px] text-zinc-400">调用</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </CenterModal>
  );
}
