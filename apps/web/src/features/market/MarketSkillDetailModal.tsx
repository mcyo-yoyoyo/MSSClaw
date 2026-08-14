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
import {
  resolveSkillSecurityScan,
  skillSecurityStatusLabel,
} from '@/domain/skillSecurityScan';
import { getSkillPack } from '@/domain/skills/catalog';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import {
  EXECUTION_TRUST_META,
  resolveSkillExecutionTrust,
} from '@/domain/executionTrust';

type DetailTab = 'overview' | 'notes' | 'guide' | 'cases' | 'versions' | 'reviews' | 'security';

/** MVP：评价模块暂不上线，Tab 保留占位。改为 true 即可恢复完整评价 UI。 */
const SKILL_REVIEWS_MVP_ENABLED = false;

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
  adminActions,
}: {
  skill: PrototypeSkillSeed;
  canRun: boolean;
  onClose: () => void;
  onRun: (skill: PrototypeSkillSeed) => void;
  onToast: (msg: string) => void;
  /** 配置 Skill 后台：更新 / 下架申请入口 */
  adminActions?: {
    onUpdateRequest: () => void;
    onUnpublishRequest: () => void;
  };
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const getEngagement = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpDownload = useContentEngagementStore((s) => s.bumpDownload);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);
  const toggleDislike = useContentEngagementStore((s) => s.toggleDislike);
  const getVote = useContentEngagementStore((s) => s.userVote);
  void engagementById;
  const eng = getEngagement(skill.id);
  const vote = getVote(skill.id);
  const scan = resolveSkillSecurityScan(skill.securityScan);

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
  const scopeLabel =
    (skill.visibility ?? 'public') === 'public' ? '公开' : '领域';
  const createdAt = skill.createdAt || '—';
  const updatedAt = skill.updatedAt || '—';
  const updatedBy = skill.updatedBy || skill.publisher || skill.author || '—';
  const usageNotes = skill.usageNotes?.trim() || '';
  const cases = skill.cases?.filter((c) => c.title?.trim()) ?? [];
  const env = skill.envInfo;
  const trust = resolveSkillExecutionTrust(canRun);
  const trustMeta = EXECUTION_TRUST_META[trust];

  const handleDownload = () => {
    bumpDownload(skill.id);
    downloadSkillFile(skill);
    onToast(`已下载：${name}`);
  };

  const tabs: { id: DetailTab; label: string; badge?: string }[] = [
    { id: 'overview', label: '概览' },
    { id: 'notes', label: '使用须知' },
    { id: 'guide', label: '快速上手' },
    { id: 'cases', label: '案例' },
    { id: 'versions', label: '版本' },
    {
      id: 'reviews',
      label: '评价',
      badge: SKILL_REVIEWS_MVP_ENABLED ? undefined : '即将开放',
    },
    { id: 'security', label: '安全扫描' },
  ];

  const versionRows =
    skill.versions?.length
      ? skill.versions
      : [
          {
            version: skill.version || '1.0.0',
            notes: '当前线上版本',
            publishedAt: skill.updatedAt || skill.createdAt,
            status: 'active' as const,
          },
        ];

  return (
    <CenterModal
      open
      title={name}
      onClose={onClose}
      size="2xl"
      header={
        <div className="shrink-0 border-b border-zinc-100 bg-white px-5 py-3.5 md:px-6">
          <div className="flex items-start gap-3.5">
            <SkillAvatar
              skillId={skill.id}
              icon={skill.icon || 'fa-cube'}
              iconUrl={skill.iconUrl}
              size={48}
              className="shrink-0 rounded-xl"
              title={name}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[17px] font-semibold tracking-tight text-zinc-900">
                      {name}
                    </h3>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        scopeLabel === '公开'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-sky-50 text-sky-800',
                      )}
                    >
                      {scopeLabel}
                    </span>
                    {skill.published ? (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                        已上架
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        未上架
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        trustMeta.badgeClass,
                      )}
                      title={trustMeta.hint}
                    >
                      {trustMeta.label}
                    </span>
                  </div>
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
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-zinc-600">
                {desc || '暂无描述'}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {deptLabel ? (
                  <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                    {deptLabel}
                  </span>
                ) : null}
                {regionLabel ? (
                  <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                    {regionLabel}
                  </span>
                ) : null}
                {bizLabel ? (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                    {bizLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-500">
                {skill.command ? (
                  <span className="rounded-md bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                    {skill.command}
                  </span>
                ) : null}
                <span className="tabular-nums">v{skill.version}</span>
                <span className="text-zinc-300">·</span>
                <span>↓ {formatToolInvokes(eng.downloads)}</span>
                <span className="text-zinc-300">·</span>
                <span>
                  赞 {formatToolInvokes(eng.likes)} / 踩 {formatToolInvokes(eng.dislikes)}
                </span>
                <span className="text-zinc-300">·</span>
                <span className="inline-flex items-center gap-1">
                  <i className="fa-solid fa-shield-halved text-[9px] text-zinc-400" />
                  {skillSecurityStatusLabel(scan.status)}
                </span>
                <span className="text-zinc-300">·</span>
                <span>{getEfficiencyLabel(skill.category)}</span>
              </div>
            </div>
          </div>
        </div>
      }
      actions={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleLike(skill.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                vote === 'like'
                  ? 'bg-sky-50 text-sky-800'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <i className="fa-solid fa-thumbs-up text-[10px]" />
              {formatToolInvokes(eng.likes)}
            </button>
            <button
              type="button"
              onClick={() => toggleDislike(skill.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                vote === 'dislike'
                  ? 'bg-zinc-100 text-zinc-800'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <i className="fa-solid fa-thumbs-down text-[10px]" />
              {formatToolInvokes(eng.dislikes)}
            </button>
          </div>
          <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              <i className="fa-solid fa-download text-[11px]" />
              下载
            </button>
            {canRun ? (
              <button
                type="button"
                onClick={() => onRun(skill)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
              >
                <i className="fa-solid fa-play text-[10px]" />
                在线试用
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="grid min-h-[480px] md:grid-cols-[minmax(0,1.85fr)_minmax(220px,0.7fr)]">
        <div className="flex min-h-0 flex-col border-zinc-100 md:border-r">
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-100 px-4 pt-3 md:px-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[12px] font-semibold transition',
                  tab === t.id
                    ? 'bg-white text-zinc-900 shadow-[inset_0_-2px_0_0_#18181b]'
                    : 'text-zinc-400 hover:text-zinc-700',
                )}
              >
                {t.label}
                {t.badge ? (
                  <span className="rounded bg-zinc-100 px-1 py-px text-[9px] font-medium text-zinc-400">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
            {tab === 'overview' ? (
              <div className="space-y-5">
                {skill.descEn && skill.descEn !== desc ? (
                  <section>
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">能力说明</h4>
                    <p className="text-[12px] leading-relaxed text-zinc-500">{skill.descEn}</p>
                  </section>
                ) : null}
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">能力边界</h4>
                  <ul className="list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed text-zinc-600">
                    <li>依赖平台对话或本地技能包执行，连接器能力以当前部署为准。</li>
                    <li>组织权限外用户不可见受限范围 Skill。</li>
                    <li>安全扫描能力待对接公司 IT，当前不作为上线硬门禁。</li>
                  </ul>
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
                {instructions ? (
                  <section>
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">
                      Skill 正文摘要
                      <span className="ml-2 font-normal text-zinc-400">对话执行时注入</span>
                    </h4>
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-3 text-[12px] leading-relaxed text-zinc-700">
                      {instructions.slice(0, 800)}
                      {instructions.length > 800 ? '…' : ''}
                    </pre>
                  </section>
                ) : null}
              </div>
            ) : null}

            {tab === 'notes' ? (
              <div className="space-y-4">
                {usageNotes ? (
                  <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <h4 className="mb-2 text-[12px] font-semibold text-amber-900">运营录入 · 使用须知</h4>
                    <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-amber-950/80">
                      {usageNotes}
                    </pre>
                  </section>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-[12px] text-zinc-400">
                    管理员尚未录入使用须知。可在「配置 Skill → 编辑 → 高级项」中补充。
                  </div>
                )}
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">权限要求</h4>
                  <p className="text-[13px] leading-relaxed text-zinc-600">
                    {ASSET_VISIBILITY_LABELS[skill.visibility ?? 'public']}
                    {deptLabel ? ` · ${deptLabel}` : ''}
                    {regionLabel ? ` · ${regionLabel}` : ''}
                  </p>
                </section>
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">注意事项</h4>
                  <ul className="list-disc space-y-1.5 pl-4 text-[12px] leading-relaxed text-zinc-600">
                    <li>输出结果需人工复核后再用于对外决策或客户材料。</li>
                    <li>勿在提示中粘贴未脱敏的客户隐私与密钥。</li>
                  </ul>
                </section>
              </div>
            ) : null}

            {tab === 'guide' ? (
              <div className="space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">调用方式</h4>
                  <p className="text-[12px] leading-relaxed text-zinc-600">
                    在任务对话中输入命令，或点底部「执行」一键启动；亦可「下载」后本地预览。
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
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">调用示例</h4>
                    <pre className="whitespace-pre-wrap rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-3 text-[12px] leading-relaxed text-zinc-700">
                      {demoPrompt}
                    </pre>
                  </section>
                ) : null}
                <section>
                  <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">分步操作</h4>
                  <ol className="list-decimal space-y-2 pl-4 text-[12px] leading-relaxed text-zinc-600">
                    <li>确认业务场景与权限范围符合当前任务。</li>
                    <li>点「下载」本地预览，或直接在平台对话中调用。</li>
                    <li>按执行计划核对输出，必要时补充上下文后重跑。</li>
                  </ol>
                </section>
                <details className="rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5">
                  <summary className="cursor-pointer text-[12px] font-semibold text-zinc-800">
                    常见问题
                  </summary>
                  <ul className="mt-2 space-y-2 text-[12px] leading-relaxed text-zinc-600">
                    <li>
                      <span className="font-semibold text-zinc-800">看不到该 Skill？</span>
                      检查账号领域 / 区域归属与可见性设置。
                    </li>
                    <li>
                      <span className="font-semibold text-zinc-800">无法「执行」？</span>
                      需已上架且当前部署支持执行；否则请先下载学习。
                    </li>
                  </ul>
                </details>
              </div>
            ) : null}

            {tab === 'cases' ? (
              <div className="space-y-4">
                {cases.length ? (
                  cases.map((c, i) => (
                    <section
                      key={`${c.title}-${i}`}
                      className="rounded-2xl border border-zinc-200 bg-white p-4"
                    >
                      <h4 className="text-[13px] font-semibold text-zinc-800">{c.title}</h4>
                      {c.input ? (
                        <>
                          <p className="mb-1 mt-3 text-[11px] text-zinc-400">输入</p>
                          <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-700">
                            {c.input}
                          </pre>
                        </>
                      ) : null}
                      {c.output ? (
                        <>
                          <p className="mb-1 mt-3 text-[11px] text-zinc-400">输出 / 效果</p>
                          <pre className="whitespace-pre-wrap rounded-xl bg-emerald-50/50 px-3 py-2.5 text-[12px] text-zinc-700">
                            {c.output}
                          </pre>
                        </>
                      ) : null}
                    </section>
                  ))
                ) : demoPrompt ? (
                  <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <h4 className="mb-2 text-[12px] font-semibold text-zinc-800">演示示例（回退）</h4>
                    <p className="mb-2 text-[11px] text-zinc-400">输入</p>
                    <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-700">
                      {demoPrompt}
                    </pre>
                  </section>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
                    暂无录入案例。可在「配置 Skill → 编辑 → 高级项」中维护。
                  </div>
                )}
              </div>
            ) : null}

            {tab === 'versions' ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] text-zinc-400">
                      <th className="px-2 py-2 font-semibold">版本号</th>
                      <th className="px-2 py-2 font-semibold">版本说明</th>
                      <th className="px-2 py-2 font-semibold">上架时间</th>
                      <th className="px-2 py-2 font-semibold">状态</th>
                      <th className="px-2 py-2 font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versionRows.map((v) => (
                      <tr key={v.version} className="border-b border-zinc-50">
                        <td className="px-2 py-2.5 font-mono font-semibold text-zinc-800">
                          v{v.version}
                        </td>
                        <td className="px-2 py-2.5 text-zinc-600">{v.notes || '—'}</td>
                        <td className="px-2 py-2.5 tabular-nums text-zinc-500">
                          {v.publishedAt || '—'}
                        </td>
                        <td className="px-2 py-2.5">
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                              v.status === 'retired'
                                ? 'bg-zinc-100 text-zinc-500'
                                : 'bg-emerald-50 text-emerald-800',
                            )}
                          >
                            {v.status === 'retired' ? '已停用' : '生效'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            onClick={handleDownload}
                            className="text-[11px] font-semibold text-sky-700 hover:underline"
                          >
                            下载
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-[11px] text-zinc-400">
                  停用指定版本需走「下架申请」（完整版支持多选版本；当前 MVP 以下架整个 Skill 为主）。
                </p>
              </div>
            ) : null}

            {tab === 'reviews' ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <i className="fa-solid fa-comment-dots text-[18px]" />
                </span>
                <p className="text-[14px] font-semibold text-zinc-800">评价功能即将开放</p>
                <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-zinc-500">
                  当前 MVP 暂不提供评分与留言；上线后可在此查看均分与使用反馈。
                </p>
                <span className="mt-3 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  MVP · 暂不上线
                </span>
              </div>
            ) : null}

            {tab === 'security' ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-500">
                    <i className="fa-solid fa-shield-halved text-[16px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-zinc-800">{scan.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">{scan.summary}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {scan.dimensions.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-3"
                    >
                      <p className="text-[12px] font-semibold text-zinc-800">{d.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{d.hint}</p>
                      <p className="mt-2 text-[10px] font-medium text-zinc-400">状态：未对接</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/40 px-4 py-4 md:border-t-0 md:px-5">
          <div className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3">
            <p className="mb-2 text-[11px] font-semibold text-zinc-500">运行与环境</p>
            <dl className="divide-y divide-zinc-50">
              <MetaRow label="连接器" value={skill.connector || '平台默认'} />
              <MetaRow label="版本" value={`v${skill.version}`} />
              <MetaRow
                label="运行状态"
                value={skill.published ? '已上架可调用' : '已沉淀 · 未上架'}
              />
              <MetaRow label="环境依赖" value={env?.dependencies || undefined} />
              <MetaRow label="算法框架" value={env?.framework || undefined} />
              <MetaRow label="运行版本" value={env?.runtimeVersion || undefined} />
              <MetaRow label="硬件 / 网络" value={env?.hardwareNetwork || undefined} />
              <MetaRow
                label="适配说明"
                value={
                  env?.dependencies || env?.framework
                    ? undefined
                    : '浏览器端任务对话 / 技能包本地预览'
                }
              />
            </dl>
          </div>

          <button
            type="button"
            onClick={() => setTab('security')}
            className="rounded-xl border border-zinc-200/80 bg-white px-3 py-3 text-left transition hover:border-zinc-300"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-zinc-500">安全扫描</p>
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                <i className="fa-solid fa-shield-halved text-[9px]" />
                {skillSecurityStatusLabel(scan.status)}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              待对接公司 IT。查看扫描维度 →
            </p>
          </button>

          <dl className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2 divide-y divide-zinc-50">
            <MetaRow label="Skill ID" value={skill.id} />
            <MetaRow label="创建人" value={skill.author || skill.publisher || '未知'} />
            <MetaRow label="创建时间" value={createdAt} />
            <MetaRow label="更新者" value={updatedBy} />
            <MetaRow label="更新时间" value={updatedAt} />
            <MetaRow label="发布方" value={skill.publisher || skill.author || undefined} />
            <MetaRow label="可见性" value={ASSET_VISIBILITY_LABELS[skill.visibility ?? 'public']} />
          </dl>

          {adminActions ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={adminActions.onUpdateRequest}
                className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-2 text-[11px] font-semibold text-sky-900 transition hover:bg-sky-100"
              >
                更新申请
              </button>
              <button
                type="button"
                onClick={adminActions.onUnpublishRequest}
                className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                下架申请
              </button>
            </div>
          ) : null}

          {!canRun ? (
            <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-2 text-center text-[11px] text-zinc-400">
              {trustMeta.hint}
            </p>
          ) : (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-[11px] leading-snug text-emerald-900/80">
              {trustMeta.hint}
            </p>
          )}
        </aside>
      </div>
    </CenterModal>
  );
}
