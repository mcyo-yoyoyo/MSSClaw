import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { CenterModal } from '@/components/center/CenterShell';
import {
  CaseDocumentPreview,
  CaseDocumentPreviewList,
} from '@/components/content/CaseDocumentPreview';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import {
  buildAgentDemoPrompt,
  buildAgentOrchestrationSteps,
  getAgentMockReport,
} from '@/domain/agents/runtime';
import { getAgentBusinessLabel } from '@/domain/agentBusinessScenarios';
import {
  getAgentCapabilityTypeLabel,
  resolveAgentCapabilityTypes,
} from '@/domain/agentHubFilters';
import {
  AGENT_LIFECYCLE_META,
  resolveAgentLifecycle,
  resolveAgentPrimaryAction,
} from '@/domain/agentLifecycle';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import {
  resolveDownloadOriginalFile,
  resolveOnlinePreviewFile,
} from '@/domain/casePreview';
import { downloadAgentFile } from '@/domain/agentExport';
import { PackageFileTree } from '@/components/market/PackageFileTree';
import { formatBytes } from '@/domain/packageFileTree';
import { downloadPackageBlob } from '@/api/blobApi';
import { skillDisplayName } from '@/domain/skillDisplay';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

/**
 * 核心业务 Tab 保持普通员工的理解路径，版本与评论作为补充信息放在末尾。
 */
type DetailTab = 'overview' | 'preview' | 'fit' | 'howto' | 'cases' | 'versions' | 'comments';

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: string }> = [
  { id: 'overview', label: '概览', icon: 'fa-compass' },
  { id: 'preview', label: '效果预览', icon: 'fa-wand-magic-sparkles' },
  { id: 'fit', label: '适用判断', icon: 'fa-bullseye' },
  { id: 'howto', label: '怎么使用', icon: 'fa-route' },
  { id: 'cases', label: '案例与方案包', icon: 'fa-briefcase' },
  { id: 'versions', label: '版本', icon: 'fa-code-branch' },
  { id: 'comments', label: '评论', icon: 'fa-comment-dots' },
];

function nonEmpty(items?: Array<string | null | undefined>): string[] {
  return Array.from(new Set((items ?? []).map((item) => item?.trim()).filter(Boolean) as string[]));
}

function formatVersionLabel(value: string): string {
  return /^v/i.test(value) ? value : `v${value}`;
}

function formatVersionTime(value?: string): string {
  const raw = value?.trim();
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const pad = (number: number) => String(number).padStart(2, '0');
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return dateOnly ? `${ymd} 00:00` : `${ymd} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="shrink-0 text-[11px] text-zinc-400">{label}</dt>
      <dd className="text-right text-[12px] font-medium leading-relaxed text-zinc-700">{value}</dd>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-zinc-200/80 bg-white p-4', className)}>
      <div className="mb-3 flex items-center gap-2">
        {icon ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <i className={cn('fa-solid text-[11px]', icon)} />
          </span>
        ) : null}
        <h4 className="text-[13px] font-semibold tracking-tight text-zinc-900">{title}</h4>
      </div>
      {children}
    </section>
  );
}

const BULLET_TONES = {
  sky: 'bg-sky-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-400',
  amber: 'bg-amber-500',
} as const;

function BulletList({
  items,
  tone = 'sky',
}: {
  items: string[];
  /** 圆点跟随所在卡片的色调，避免绿色 / 红色卡片里出现蓝点 */
  tone?: keyof typeof BULLET_TONES;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-[12px] leading-relaxed text-zinc-600">
          <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', BULLET_TONES[tone])} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TagList({ items, empty = '暂未配置' }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-[12px] text-zinc-400">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-lg border border-sky-100 bg-sky-50/70 px-2 py-1 text-[11px] font-medium text-sky-800"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** §6.7 决策 A：整块无内容时给一句明确说明，而不是拿模板句充数 */
function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-[12px] text-zinc-400">
      {text}
    </div>
  );
}

/** §4.2 效果预览的三段式卡片：输入 → 处理 → 输出 */
function PipelineCard({
  step,
  title,
  icon,
  accent,
  children,
}: {
  step: string;
  title: string;
  icon: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border p-4',
        accent ? 'border-sky-100 bg-sky-50/40' : 'border-zinc-200/80 bg-white',
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg text-[11px]',
            accent ? 'bg-sky-100 text-sky-700' : 'bg-zinc-100 text-zinc-500',
          )}
        >
          <i className={cn('fa-solid', icon)} />
        </span>
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-400">{step}</p>
          <h4 className="text-[13px] font-semibold tracking-tight text-zinc-900">{title}</h4>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * 一条可走的路径：有链接就是可点的行，没有就置灰并说明原因。
 * §6.7 要求没有资源时不展示空链接，所以这里不渲染成可点按钮。
 */
function PathRow({
  icon,
  label,
  desc,
  href,
  onClick,
  missing,
}: {
  icon: string;
  label: string;
  desc?: string;
  href?: string;
  onClick?: () => void;
  missing?: string;
}) {
  const available = Boolean(href || onClick);
  const body = (
    <>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          available ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-50 text-zinc-300',
        )}
      >
        <i className={cn('fa-solid text-[11px]', icon)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[12px] font-semibold', available ? 'text-zinc-800' : 'text-zinc-400')}>
          {label}
        </span>
        <span className="block text-[11px] text-zinc-400">{available ? desc : missing}</span>
      </span>
      {available ? <i className="fa-solid fa-chevron-right text-[9px] text-zinc-300" /> : null}
    </>
  );

  const className = cn(
    'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
    available
      ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
      : 'border-dashed border-zinc-200 bg-zinc-50/60',
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function ExampleBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{label}</p>
      <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-zinc-700">
        {value || '暂未配置示例'}
      </pre>
    </div>
  );
}

function GuideStep({
  index,
  title,
  last,
  children,
}: {
  index: number;
  title: string;
  /** 最后一步不画竖直连线 */
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative grid grid-cols-[30px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
      <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
        {index}
      </span>
      <div className="min-w-0 pt-0.5">
        <h4 className="text-[12px] font-semibold text-zinc-900">{title}</h4>
        <div className="mt-1.5 text-[12px] leading-relaxed text-zinc-600">{children}</div>
      </div>
      {last ? null : <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-zinc-200" />}
    </div>
  );
}

/**
 * Agent Hub 目录详情：业务信息在左、操作入口在右；移动端操作区前置。
 * 结构化详情字段优先，旧 Agent 使用运行包与现有字段降级，保证 MVP 不出现空白页面。
 */
export function CatalogAgentDetailModal({
  agent,
  submittedCases = [],
  canRun,
  onClose,
  onRun,
  onToast,
  adminActions,
}: {
  agent: PrototypeAgentSeed;
  submittedCases?: PortalContentItem[];
  canRun: boolean;
  onClose: () => void;
  onRun: (agent: PrototypeAgentSeed) => void;
  onToast: (msg: string) => void;
  adminActions?: {
    onEdit: () => void;
  };
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const skills = useMarketplaceStore((state) => state.skills);
  const getEngagement = useContentEngagementStore((state) => state.get);
  const engagementById = useContentEngagementStore((state) => state.byId);
  const bumpDownload = useContentEngagementStore((state) => state.bumpDownload);
  const toggleLike = useContentEngagementStore((state) => state.toggleLike);
  const toggleDislike = useContentEngagementStore((state) => state.toggleDislike);
  const getVote = useContentEngagementStore((state) => state.userVote);
  void engagementById;

  const engagement = getEngagement(agent.id);
  const vote = getVote(agent.id);
  const scopeLabel = ASSET_VISIBILITY_LABELS[agent.visibility ?? 'public'];
  const businessLabel = getAgentBusinessLabel(agent) || agent.bizLine || '通用业务任务';
  const deptLabel = agent.ownerDeptIds?.[0] ? getDeptLabel(agent.ownerDeptIds[0]) : '';
  const regionLabel = agent.ownerRegionIds?.[0] ? getRegionLabel(agent.ownerRegionIds[0]) : '';
  const maintainer = agent.maintainer || agent.publisher || agent.author;
  const version = agent.version?.trim() || 'V1.0';
  const updatedAt = agent.updatedAt?.trim() || '未记录';
  const createdAt = agent.createdAt?.trim() || '未记录';
  const primaryId = agent.primarySkillId || agent.skillIds?.[0];

  const lifecycle = resolveAgentLifecycle(agent);
  const lifecycleMeta = AGENT_LIFECYCLE_META[lifecycle];
  const hasDemo = Boolean(agent.demoUrl?.trim());
  const hasSolutionDoc = Boolean(agent.solutionDocUrl?.trim());
  const primaryAction = resolveAgentPrimaryAction({
    status: lifecycle,
    canRun,
    hasDemo,
    hasSolutionDoc,
  });

  const mountedSkills = useMemo(
    () =>
      (agent.skillIds ?? [])
        .map((id) => skills.find((skill) => skill.id === id))
        .filter((skill): skill is PrototypeSkillSeed => Boolean(skill)),
    [agent.skillIds, skills],
  );
  const primarySkill = mountedSkills.find((skill) => skill.id === primaryId) ?? mountedSkills[0] ?? null;
  const skillNames = mountedSkills.map(skillDisplayName);
  const demoPrompt = agent.inputOutput?.inputExample?.trim() || buildAgentDemoPrompt(agent).trim();
  const outputExample = agent.inputOutput?.outputExample?.trim() || getAgentMockReport(agent.id) || '';
  const orchestrationSteps =
    agent.quickStart?.steps?.length
      ? nonEmpty(agent.quickStart.steps)
      : buildAgentOrchestrationSteps(agent, primarySkill) ?? [];

  /**
   * §6.7 决策 A：新字段一律「有则显示、无则整块隐藏」，不再用代码拼兜底文案。
   * 页面可能因此变短，但不会出现看似配置过、实则是模板句的内容。
   */
  const capabilities = nonEmpty(agent.capabilities).slice(0, 5);
  const targetUsers = nonEmpty(agent.targetUsers);
  const boundaries = nonEmpty(agent.capabilityBoundaries);
  const suitableFor = nonEmpty(agent.suitableFor);
  const notSuitableFor = nonEmpty(agent.notSuitableFor);
  const prerequisites = nonEmpty(agent.quickStart?.prerequisites);
  const inputRequirements = nonEmpty(agent.quickStart?.inputRequirements);
  const processSteps = nonEmpty(agent.inputOutput?.processSteps);
  const scenarios = nonEmpty([businessLabel, ...(agent.scenarioTags ?? [])]).slice(0, 5);
  /**
   * §2.2 顶部标签口径：业务场景 / 适用对象 / 能力类型，复用 1.4 已有的 capabilityTypeIds。
   * 三类之间会撞词（如业务场景与能力类型都叫「数据分析」），nonEmpty 去重后截到 5 个。
   */
  const capabilityTypeLabels = resolveAgentCapabilityTypes(agent).map(getAgentCapabilityTypeLabel);
  const headerTags = nonEmpty([
    businessLabel,
    targetUsers[0],
    ...capabilityTypeLabels,
  ]).slice(0, 5);
  const cases = agent.cases ?? [];
  const caseAttachments = agent.caseAttachments ?? [];
  const valueProposition = agent.valueProposition?.trim() || '';

  const environment = agent.environment;
  // 适配平台是顶部标签与右侧栏都要用的，缺省回退平台自身尚属事实陈述，保留
  const platforms = nonEmpty(
    environment?.platforms?.length ? environment.platforms : ['MSS AI提效平台'],
  );
  const usageModes = nonEmpty(environment?.usageModes);
  const environmentRequirements = nonEmpty(environment?.requirements);
  const configuration = nonEmpty(environment?.configuration);
  const hasEnvironmentMeta = Boolean(
    usageModes.length ||
      environment?.requiresCode !== undefined ||
      environment?.supportsAssistantImport !== undefined,
  );

  /**
   * §6.7 决策 A：没有内容的 Tab 直接不出现，而不是进去看到一片兜底文案。
   * 概览 / 怎么使用 / 案例与方案包 / 版本 / 评论恒在；预览和适用判断按内容显示。
   */
  const hasPreview = Boolean(
    processSteps.length ||
      skillNames.length ||
      demoPrompt ||
      outputExample ||
      agent.inputOutput?.inputFormat ||
      agent.inputOutput?.outputFormat ||
      nonEmpty(agent.inputOutput?.inputTypes).length ||
      nonEmpty(agent.inputOutput?.outputFields).length,
  );
  const hasFit = Boolean(
    suitableFor.length ||
      notSuitableFor.length ||
      boundaries.length ||
      prerequisites.length ||
      inputRequirements.length ||
      agent.requiresHumanReview,
  );
  const visibleTabs = DETAIL_TABS.filter(
    (item) =>
      (item.id !== 'preview' || hasPreview) && (item.id !== 'fit' || hasFit),
  );
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : 'overview';

  const packageBlob = agent.packageBlob;

  /** 有运营上传的执行包就下发原包；没有才回落到前端即时生成的资源包 */
  const handleDownload = async () => {
    bumpDownload(agent.id);
    if (packageBlob) {
      try {
        await downloadPackageBlob(packageBlob);
        onToast(`已下载执行包：${packageBlob.name}`);
      } catch {
        onToast('执行包下载失败，请检查登录状态或后端连接');
      }
      return;
    }
    downloadAgentFile(agent);
    onToast(`已下载 Agent 资源包：${agent.name}`);
  };

  const copyText = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(success);
    } catch {
      onToast('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const handleFeedback = () => {
    if (agent.feedbackUrl) {
      const opened = window.open(agent.feedbackUrl, '_blank', 'noopener,noreferrer');
      if (!opened) onToast('浏览器拦截了反馈页面，请允许弹窗后重试');
      return;
    }
    void copyText(
      `【${agent.name} 使用反馈】\n问题描述：\n期望结果：\n复现步骤：\n当前版本：${version}\n维护团队：${maintainer}`,
      '已复制反馈模板，可发送给维护团队',
    );
  };

  return (
    <CenterModal
      open
      title={agent.name}
      onClose={onClose}
      size="2xl"
      header={
        <div className="shrink-0 border-b border-zinc-100 bg-white px-5 py-4 md:px-6">
          <div className="flex items-start gap-3.5">
            <AgentPortrait
              agentId={agent.id}
              name={agent.name}
              icon={agent.icon}
              avatarUrl={agent.avatarUrl}
              avatarPresetId={agent.avatarPresetId}
              size={54}
              className="shrink-0 rounded-2xl"
              title={agent.name}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-[18px] font-semibold tracking-tight text-zinc-900">{agent.name}</h3>
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        (agent.visibility ?? 'public') === 'public'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-sky-50 text-sky-800',
                      )}
                    >
                      {scopeLabel}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                        lifecycleMeta.badgeClass,
                      )}
                      title="Agent 当前成熟度：决定主操作入口"
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', lifecycleMeta.dotClass)} />
                      {lifecycleMeta.badgeText({ hasDemo, hasSolutionDoc })}
                    </span>
                    <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                      {version}
                    </span>
                  </div>
                  {/* §3 顶部一句话价值：用户不点任何 Tab 也能看懂这个 Agent 干什么 */}
                  <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-zinc-600">
                    {valueProposition || agent.desc || '暂无功能简介'}
                  </p>
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

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {deptLabel ? (
                  <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">{deptLabel}</span>
                ) : null}
                {regionLabel ? (
                  <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">{regionLabel}</span>
                ) : null}
                {headerTags.map((tag, index) => (
                  <span
                    key={tag}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                      index === 0
                        ? 'bg-amber-50 text-amber-800'
                        : index === 1 && targetUsers.length
                          ? 'bg-sky-50 text-sky-800'
                          : 'bg-zinc-100 text-zinc-600',
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400">
                <span>维护：{maintainer}</span>
                <span>更新：{updatedAt}</span>
                <span>{formatToolInvokes(engagement.views)} 次查看</span>
                <span>{formatToolInvokes(engagement.downloads)} 次下载</span>
                <span>{formatToolInvokes(engagement.likes)} 次点赞</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid min-h-full grid-cols-1 md:grid-cols-[minmax(0,1fr)_248px]">
        <main className="min-w-0 md:border-r md:border-zinc-100">
          <nav className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-zinc-100 bg-white/95 px-4 pt-2 backdrop-blur md:px-5" aria-label="Agent 详情导航">
            {visibleTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11px] font-semibold transition',
                  activeTab === item.id
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700',
                )}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                <i className={cn('fa-solid text-[10px]', item.icon)} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-[520px] bg-zinc-50/40 px-4 py-4 md:px-5 md:py-5">
            {activeTab === 'overview' ? (
              <div className="space-y-4">
                {valueProposition ? (
                  <section className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700">
                      这个 Agent 帮你做什么
                    </p>
                    <p className="text-[13px] leading-relaxed text-zinc-800">{valueProposition}</p>
                  </section>
                ) : null}
                {capabilities.length || targetUsers.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {capabilities.length ? (
                      <SectionCard title="核心能力" icon="fa-bolt">
                        <BulletList items={capabilities} />
                      </SectionCard>
                    ) : null}
                    {targetUsers.length ? (
                      <SectionCard title="适用对象" icon="fa-users">
                        <TagList items={targetUsers} />
                      </SectionCard>
                    ) : null}
                  </div>
                ) : null}
                {scenarios.length ? (
                  <SectionCard title="适用场景" icon="fa-bullseye">
                    <TagList items={scenarios} />
                  </SectionCard>
                ) : null}
                <SectionCard title="能力组成" icon="fa-cubes-stacked">
                  <p className="mb-3 text-[12px] leading-relaxed text-zinc-500">
                    Agent 通过编排多个 Skill 完成相对完整的业务任务；以下为当前挂载能力。
                  </p>
                  <TagList items={skillNames} empty="当前未挂载 Skill" />
                </SectionCard>
                {!valueProposition && !capabilities.length && !targetUsers.length ? (
                  <EmptyHint text="该 Agent 尚未配置概览说明，可联系维护团队补充。" />
                ) : null}
              </div>
            ) : null}

            {activeTab === 'preview' ? (
              <div className="space-y-4">
                {/* §4.2 三段式：输入什么 → Agent 做什么 → 输出什么 */}
                <div className="grid gap-3 lg:grid-cols-3">
                  <PipelineCard step="01" title="你提供" icon="fa-arrow-up-from-bracket">
                    <BulletList items={nonEmpty(agent.inputOutput?.inputTypes)} />
                    <MetaRow label="输入格式" value={agent.inputOutput?.inputFormat} />
                    <MetaRow label="关键字段" value={nonEmpty(agent.inputOutput?.inputFields).join('、') || null} />
                    <MetaRow label="支持文件" value={nonEmpty(agent.inputOutput?.supportedFiles).join('、') || null} />
                  </PipelineCard>
                  <PipelineCard step="02" title="Agent 处理" icon="fa-gears" accent>
                    {processSteps.length ? (
                      <BulletList items={processSteps} />
                    ) : skillNames.length ? (
                      <p className="text-[12px] leading-relaxed text-zinc-600">
                        依次编排 {skillNames.join(' → ')}，逐步完成任务。
                      </p>
                    ) : (
                      <p className="text-[12px] text-zinc-400">暂未配置处理环节说明。</p>
                    )}
                  </PipelineCard>
                  <PipelineCard step="03" title="你得到" icon="fa-file-circle-check">
                    <MetaRow label="输出格式" value={agent.inputOutput?.outputFormat} />
                    <MetaRow label="关键字段" value={nonEmpty(agent.inputOutput?.outputFields).join('、') || null} />
                    <MetaRow label="业务使用" value={agent.inputOutput?.resultUsage} />
                  </PipelineCard>
                </div>
                {demoPrompt || outputExample ? (
                  <SectionCard title="样例演示" icon="fa-eye">
                    <div className="grid gap-3 xl:grid-cols-2">
                      {demoPrompt ? <ExampleBlock label="样例输入" value={demoPrompt} /> : null}
                      {outputExample ? <ExampleBlock label="样例输出" value={outputExample} /> : null}
                    </div>
                  </SectionCard>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'fit' ? (
              <div className="space-y-4">
                {suitableFor.length ? (
                  <SectionCard title="适合你，如果" icon="fa-circle-check" className="border-emerald-100 bg-emerald-50/35">
                    <BulletList items={suitableFor} tone="emerald" />
                  </SectionCard>
                ) : null}
                {prerequisites.length || inputRequirements.length ? (
                  <SectionCard title="使用前准备" icon="fa-list-check">
                    <BulletList items={prerequisites} />
                    {inputRequirements.length ? (
                      <>
                        <p className="mb-2 mt-3 border-t border-zinc-100 pt-3 text-[11px] font-semibold text-zinc-500">
                          输入要求
                        </p>
                        <BulletList items={inputRequirements} />
                      </>
                    ) : null}
                  </SectionCard>
                ) : null}
                {notSuitableFor.length ? (
                  <SectionCard title="暂不适合，如果" icon="fa-circle-xmark" className="border-rose-100 bg-rose-50/35">
                    <BulletList items={notSuitableFor} tone="rose" />
                  </SectionCard>
                ) : null}
                {boundaries.length ? (
                  <SectionCard title="能力边界" icon="fa-shield-halved" className="border-amber-100 bg-amber-50/35">
                    <BulletList items={boundaries} tone="amber" />
                  </SectionCard>
                ) : null}
                {agent.requiresHumanReview ? (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
                    <i className="fa-solid fa-triangle-exclamation mt-0.5 text-[11px]" />
                    该 Agent 的产出需人工复核后再用于正式业务。
                  </p>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'howto' ? (
              <div className="space-y-4">
                {/* §5.4 可运行走在线路径；建设中走 Demo / 方案文档 / 执行包 / 反馈 */}
                {lifecycle === 'runnable' ? (
                  <SectionCard title="在线使用路径" icon="fa-route">
                    <div className="mt-1">
                      <GuideStep index={1} title="确认可用">
                        当前 Agent 已支持在平台内直接运行，点击右侧「{primaryAction.label}」进入任务。
                      </GuideStep>
                      <GuideStep index={2} title="准备输入">
                        {inputRequirements.length ? (
                          <BulletList items={inputRequirements} />
                        ) : (
                          '按运行页面提示提交任务目标、业务背景与所需材料。'
                        )}
                      </GuideStep>
                      <GuideStep index={3} title="执行步骤" last={!agent.quickStart?.faqs?.length}>
                        {orchestrationSteps.length ? (
                          <BulletList items={orchestrationSteps} />
                        ) : (
                          '提交后按页面提示查看分步结果。'
                        )}
                      </GuideStep>
                      {agent.quickStart?.faqs?.length ? (
                        <GuideStep index={4} title="常见问题" last>
                          <div className="space-y-2">
                            {agent.quickStart.faqs.map((faq) => (
                              <details key={faq.question} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                                <summary className="cursor-pointer font-medium text-zinc-700">{faq.question}</summary>
                                <p className="mt-2 text-zinc-500">{faq.answer}</p>
                              </details>
                            ))}
                          </div>
                        </GuideStep>
                      ) : null}
                    </div>
                  </SectionCard>
                ) : (
                  <>
                    <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12px] leading-relaxed text-amber-900">
                      <i className="fa-solid fa-circle-info mt-0.5 text-[11px]" />
                      该 Agent 暂不支持在线运行，可先查看 Demo 与方案材料，或下载执行包在本地复用。
                    </p>
                    <SectionCard title="当前可走的路径" icon="fa-signs-post">
                      <div className="space-y-2">
                        <PathRow
                          icon="fa-play"
                          label="查看 Demo"
                          desc="了解实际运行效果"
                          href={agent.demoUrl}
                          missing="维护团队尚未提供 Demo 入口"
                        />
                        <PathRow
                          icon="fa-file-lines"
                          label="查看方案文档"
                          desc="了解方案设计与落地路径"
                          href={agent.solutionDocUrl}
                          missing="维护团队尚未提供方案文档"
                        />
                        <PathRow
                          icon="fa-download"
                          label="下载执行包"
                          desc="获取可在本地复用的材料"
                          onClick={handleDownload}
                        />
                        <PathRow
                          icon="fa-comment-dots"
                          label="反馈建议"
                          desc="告诉维护团队你的场景与诉求"
                          onClick={handleFeedback}
                        />
                      </div>
                    </SectionCard>
                  </>
                )}
                {agent.quickStart?.installGuide || environment?.packageGuide ? (
                  <SectionCard title="导入 / 安装说明" icon="fa-box-open">
                    <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-600">
                      {agent.quickStart?.installGuide || environment?.packageGuide}
                    </p>
                  </SectionCard>
                ) : null}
              </div>
            ) : null}

            {activeTab === 'cases' ? (
              <div className="space-y-4">
                {cases.map((item, index) => (
                  <section key={`${item.title}-${index}`} className="rounded-2xl border border-zinc-200/80 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700">案例 {String(index + 1).padStart(2, '0')}</p>
                        <h4 className="mt-1 text-[14px] font-semibold tracking-tight text-zinc-900">{item.title}</h4>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.scenario ? <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">{item.scenario}</span> : null}
                        {item.audience ? <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-800">{item.audience}</span> : null}
                      </div>
                    </div>
                    {item.problem ? (
                      <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-600">
                        <span className="font-semibold text-zinc-800">使用前问题：</span>{item.problem}
                      </div>
                    ) : null}
                    {item.input || item.output ? (
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        {item.input ? <ExampleBlock label="样例输入" value={item.input} /> : null}
                        {item.output ? <ExampleBlock label="样例输出" value={item.output} /> : null}
                      </div>
                    ) : null}
                    {item.outcome ? (
                      <p className="mt-3 border-l-2 border-sky-400 pl-3 text-[12px] leading-relaxed text-sky-900">
                        <span className="font-semibold">效果说明：</span>{item.outcome}
                      </p>
                    ) : null}
                    {item.resourceUrl ? (
                      <a href={item.resourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900">
                        查看关联资源 <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                      </a>
                    ) : null}
                  </section>
                ))}

                {submittedCases.map((item, index) => {
                  const previewFile = resolveOnlinePreviewFile(item);
                  const originalFile = resolveDownloadOriginalFile(item);
                  return (
                    <section
                      key={item.id}
                      className="rounded-2xl border border-sky-200/80 bg-sky-50/30 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700">
                            提报案例 {String(index + 1).padStart(2, '0')}
                          </p>
                          <h4 className="mt-1 text-[14px] font-semibold tracking-tight text-zinc-900">
                            {item.title}
                          </h4>
                          {item.desc ? (
                            <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                              {item.desc}
                            </p>
                          ) : null}
                        </div>
                        {item.isGold ? (
                          <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">
                            金案例
                          </span>
                        ) : null}
                      </div>

                      {item.painPoint ? (
                        <div className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-600">
                          <span className="font-semibold text-zinc-800">业务痛点：</span>
                          {item.painPoint}
                        </div>
                      ) : null}
                      {item.impactMetric ? (
                        <p className="mt-3 border-l-2 border-emerald-400 pl-3 text-[12px] leading-relaxed text-emerald-900">
                          <span className="font-semibold">成效：</span>
                          {item.impactMetric}
                        </p>
                      ) : null}

                      {previewFile ? (
                        <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white p-3">
                          <CaseDocumentPreview
                            file={previewFile}
                            downloadFile={originalFile}
                            policy="restricted"
                          />
                        </div>
                      ) : item.homepageUrl ? (
                        <a
                          href={item.homepageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900"
                        >
                          查看案例材料
                          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                        </a>
                      ) : null}
                    </section>
                  );
                })}

                {caseAttachments.length ? (
                  <SectionCard title="样例附件" icon="fa-paperclip">
                    <CaseDocumentPreviewList files={caseAttachments} policy="restricted" />
                  </SectionCard>
                ) : null}

                {/* §6.5 方案包：文档类资源标出文件类型，避免用户不知道点开是什么 */}
                <SectionCard title="方案与执行材料" icon="fa-folder-open">
                  <div className="space-y-2">
                    <PathRow
                      icon="fa-file-powerpoint"
                      label="解决方案文档"
                      desc="方案设计与落地路径"
                      href={agent.solutionDocUrl}
                      missing="尚未上传解决方案文档"
                    />
                    <PathRow
                      icon="fa-play"
                      label="Demo 入口"
                      desc="实际运行效果演示"
                      href={agent.demoUrl}
                      missing="尚未提供 Demo 入口"
                    />
                    <PathRow
                      icon="fa-box-archive"
                      label={packageBlob ? `执行包 · ${packageBlob.name}` : '执行包'}
                      desc={
                        packageBlob
                          ? `${formatBytes(packageBlob.size)} · 上传于 ${packageBlob.uploadedAt.slice(0, 10)}`
                          : `资源更新时间：${updatedAt}`
                      }
                      onClick={handleDownload}
                    />
                  </div>
                  {packageBlob ? (
                    <div className="mt-3">
                      <p className="mb-2 text-[11px] font-semibold text-zinc-500">包内文件</p>
                      <PackageFileTree
                        source={{
                          url: packageBlob.url,
                          name: packageBlob.name,
                          size: packageBlob.size,
                        }}
                      />
                    </div>
                  ) : null}
                  {environment?.packageGuide ? (
                    <>
                      <p className="mb-2 mt-4 border-t border-zinc-100 pt-3 text-[11px] font-semibold text-zinc-500">复用说明</p>
                      <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-600">{environment.packageGuide}</p>
                    </>
                  ) : null}
                </SectionCard>

                {!cases.length && !caseAttachments.length && !submittedCases.length ? (
                  <EmptyHint text="该 Agent 尚未配置 Demo 案例，可先查看上方方案与执行材料。" />
                ) : null}
              </div>
            ) : null}

            {activeTab === 'versions' ? (
              <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white p-4">
                <table className="w-full min-w-[520px] text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[11px] text-zinc-400">
                      <th className="px-2 py-2 font-semibold">版本号</th>
                      <th className="px-2 py-2 font-semibold">版本说明</th>
                      <th className="px-2 py-2 font-semibold">更新时间</th>
                      <th className="px-2 py-2 font-semibold">状态</th>
                      <th className="px-2 py-2 font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-2.5 font-mono font-semibold text-zinc-800">
                        {formatVersionLabel(version)}
                      </td>
                      <td className="px-2 py-2.5 text-zinc-600">
                        {agent.versionSummary?.trim() || '当前线上版本'}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-zinc-500">
                        {formatVersionTime(agent.updatedAt || agent.createdAt)}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          生效
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
                  </tbody>
                </table>
              </div>
            ) : null}

            {activeTab === 'comments' ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  <i className="fa-solid fa-comment-dots text-[18px]" />
                </span>
                <p className="text-[14px] font-semibold text-zinc-800">评论功能即将开放</p>
                <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-zinc-500">
                  当前暂不提供评分与留言；上线后可在此查看使用反馈。
                </p>
                <span className="mt-3 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  即将开放
                </span>
              </div>
            ) : null}
          </div>
        </main>

        <aside className="order-first border-b border-zinc-100 bg-white md:order-none md:border-b-0">
          <div className="space-y-4 p-4 md:sticky md:top-0">
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">开始使用</p>
              {/* §5.3 主按钮只保留一个，且与当前成熟度一致 */}
              <button
                type="button"
                disabled={Boolean(primaryAction.disabledHint)}
                onClick={() => {
                  if (primaryAction.disabledHint) return;
                  if (primaryAction.id === 'experience') {
                    onRun(agent);
                    return;
                  }
                  const url =
                    primaryAction.id === 'demo' ? agent.demoUrl : agent.solutionDocUrl;
                  if (!url) return;
                  const opened = window.open(url, '_blank', 'noopener,noreferrer');
                  if (!opened) onToast('浏览器拦截了新窗口，请允许弹窗后重试');
                }}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition',
                  primaryAction.disabledHint
                    ? 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800',
                )}
              >
                <i className={cn('fa-solid text-[10px]', primaryAction.icon)} />
                {primaryAction.label}
              </button>
              {primaryAction.disabledHint ? (
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
                  {primaryAction.disabledHint}
                </p>
              ) : null}
            </section>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
              <button type="button" onClick={handleDownload} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50">
                <i className="fa-solid fa-download text-[10px] text-zinc-400" />
                下载资源包
              </button>
              <button type="button" onClick={() => setTab('howto')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50">
                <i className="fa-solid fa-book-open text-[10px] text-zinc-400" />
                怎么使用
              </button>
              <button
                type="button"
                disabled={!agent.installCommand}
                onClick={() => agent.installCommand && void copyText(agent.installCommand, '安装命令已复制')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium transition',
                  agent.installCommand
                    ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                    : 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300',
                )}
              >
                <i className="fa-solid fa-terminal text-[10px]" />
                {agent.installCommand ? '复制安装命令' : '暂无安装命令'}
              </button>
              <button type="button" onClick={handleFeedback} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50">
                <i className="fa-regular fa-message text-[10px] text-zinc-400" />
                反馈建议
              </button>
              {adminActions ? (
                <button type="button" onClick={adminActions.onEdit} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 md:col-span-1">
                  <i className="fa-solid fa-pen text-[10px] text-zinc-400" />
                  编辑 Agent
                </button>
              ) : null}
            </div>

            {/* §2.5：版本与环境不再占主 Tab，收进右侧栏，任意 Tab 下都能看到 */}
            <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">关键状态</p>
              <dl className="divide-y divide-zinc-200/70">
                <MetaRow label="当前状态" value={lifecycleMeta.badgeText({ hasDemo, hasSolutionDoc })} />
                <MetaRow label="当前版本" value={version} />
                <MetaRow label="更新时间" value={updatedAt} />
                <MetaRow label="创建时间" value={createdAt} />
                <MetaRow label="适配平台" value={platforms.join('、')} />
                <MetaRow label="开放范围" value={scopeLabel} />
                <MetaRow label="维护团队" value={maintainer} />
              </dl>
              {agent.versionSummary?.trim() ? (
                <p className="mt-2 border-t border-zinc-200/70 pt-2 text-[11px] leading-relaxed text-zinc-500">
                  {agent.versionSummary}
                </p>
              ) : null}
            </section>

            {hasEnvironmentMeta || environmentRequirements.length || configuration.length ? (
              <details className="rounded-2xl border border-zinc-200/80 bg-white p-3">
                <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                  运行环境
                </summary>
                <div className="mt-2 space-y-3">
                  {hasEnvironmentMeta ? (
                    <dl className="divide-y divide-zinc-100">
                      <MetaRow label="使用方式" value={usageModes.join('、') || null} />
                      <MetaRow
                        label="代码能力"
                        value={environment?.requiresCode === undefined ? null : environment.requiresCode ? '需要' : '不需要'}
                      />
                      <MetaRow
                        label="员工助手导入"
                        value={
                          environment?.supportsAssistantImport === undefined
                            ? null
                            : environment.supportsAssistantImport
                              ? '支持'
                              : '暂不支持'
                        }
                      />
                    </dl>
                  ) : null}
                  {environmentRequirements.length ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-zinc-500">环境要求</p>
                      <BulletList items={environmentRequirements} />
                    </div>
                  ) : null}
                  {configuration.length ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-zinc-500">配置要求</p>
                      <BulletList items={configuration} />
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}

            <section className="rounded-2xl border border-zinc-200/80 bg-white p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[13px] font-semibold tabular-nums text-zinc-800">{formatToolInvokes(engagement.downloads)}</p>
                  <p className="mt-0.5 text-[9px] text-zinc-400">下载</p>
                </div>
                <div>
                  <p className="text-[13px] font-semibold tabular-nums text-zinc-800">{formatToolInvokes(engagement.likes)}</p>
                  <p className="mt-0.5 text-[9px] text-zinc-400">点赞</p>
                </div>
                <div>
                  <p className="text-[13px] font-semibold tabular-nums text-zinc-800">{formatToolInvokes(engagement.dislikes)}</p>
                  <p className="mt-0.5 text-[9px] text-zinc-400">点踩</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3">
                <button
                  type="button"
                  onClick={() => toggleLike(agent.id)}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition',
                    vote === 'like' ? 'bg-sky-50 text-sky-700' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100',
                  )}
                  aria-pressed={vote === 'like'}
                >
                  <i className="fa-solid fa-thumbs-up text-[10px]" /> 点赞
                </button>
                <button
                  type="button"
                  onClick={() => toggleDislike(agent.id)}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition',
                    vote === 'dislike' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100',
                  )}
                  aria-pressed={vote === 'dislike'}
                >
                  <i className="fa-solid fa-thumbs-down text-[10px]" /> 点踩
                </button>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </CenterModal>
  );
}
