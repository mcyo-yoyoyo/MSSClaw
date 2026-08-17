import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { CenterModal } from '@/components/center/CenterShell';
import { formatToolInvokes } from '@/domain/aiToolCategories';
import {
  buildAgentDemoPrompt,
  buildAgentOrchestrationSteps,
  getAgentMockReport,
  getAgentSystemPrompt,
} from '@/domain/agents/runtime';
import { getAgentBusinessLabel } from '@/domain/agentBusinessScenarios';
import type {
  AgentCaseItem,
  PrototypeAgentSeed,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import { downloadAgentFile } from '@/domain/agentExport';
import { skillDisplayName } from '@/domain/skillDisplay';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type DetailTab =
  | 'overview'
  | 'scenarios'
  | 'input-output'
  | 'guide'
  | 'cases'
  | 'version'
  | 'environment';

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: string }> = [
  { id: 'overview', label: '概览', icon: 'fa-compass' },
  { id: 'scenarios', label: '适用场景', icon: 'fa-bullseye' },
  { id: 'input-output', label: '输入输出', icon: 'fa-arrow-right-arrow-left' },
  { id: 'guide', label: '快速上手', icon: 'fa-wand-magic-sparkles' },
  { id: 'cases', label: '案例', icon: 'fa-briefcase' },
  { id: 'version', label: '版本', icon: 'fa-code-branch' },
  { id: 'environment', label: '环境信息', icon: 'fa-laptop-code' },
];

function nonEmpty(items?: Array<string | null | undefined>): string[] {
  return Array.from(new Set((items ?? []).map((item) => item?.trim()).filter(Boolean) as string[]));
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-[12px] leading-relaxed text-zinc-600">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
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
  children,
}: {
  index: number;
  title: string;
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
      {index < 7 ? <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-zinc-200" /> : null}
    </div>
  );
}

function caseFallback(params: {
  agent: PrototypeAgentSeed;
  scenario: string;
  audience: string;
  input: string;
  output: string;
}): AgentCaseItem {
  return {
    title: `${params.scenario}演示案例`,
    scenario: params.scenario,
    audience: params.audience,
    problem: `需要将分散的业务材料转化为结构清晰、可继续执行的${params.scenario}结果。`,
    input: params.input,
    output: params.output || `由 ${params.agent.name} 生成结构化结果，并给出结论和下一步行动建议。`,
    outcome: '通过标准任务流程降低上手门槛，并提升结果结构的一致性。',
  };
}

/**
 * Agent Hub 目录详情：业务信息在左、操作入口在右；移动端操作区前置。
 * 结构化详情字段优先，旧 Agent 使用运行包与现有字段降级，保证 MVP 不出现空白页面。
 */
export function CatalogAgentDetailModal({
  agent,
  canRun,
  onClose,
  onRun,
  onToast,
  adminActions,
}: {
  agent: PrototypeAgentSeed;
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

  const mountedSkills = useMemo(
    () =>
      (agent.skillIds ?? [])
        .map((id) => skills.find((skill) => skill.id === id))
        .filter((skill): skill is PrototypeSkillSeed => Boolean(skill)),
    [agent.skillIds, skills],
  );
  const primarySkill = mountedSkills.find((skill) => skill.id === primaryId) ?? mountedSkills[0] ?? null;
  const skillNames = mountedSkills.map(skillDisplayName);
  const persona = getAgentSystemPrompt(agent)?.trim() || '';
  const demoPrompt = agent.inputOutput?.inputExample?.trim() || buildAgentDemoPrompt(agent).trim();
  const outputExample = agent.inputOutput?.outputExample?.trim() || getAgentMockReport(agent.id) || '';
  const orchestrationSteps =
    agent.quickStart?.steps?.length
      ? nonEmpty(agent.quickStart.steps)
      : buildAgentOrchestrationSteps(agent, primarySkill) ?? [];

  const capabilities = nonEmpty(
    agent.capabilities?.length
      ? agent.capabilities
      : [
          agent.desc,
          ...skillNames.slice(0, 3).map((name) => `编排「${name}」完成对应单点能力`),
          orchestrationSteps.length ? '按完整流程汇总结果并给出下一步行动建议' : null,
        ],
  ).slice(0, 5);
  const targetUsers = nonEmpty(
    agent.targetUsers?.length
      ? agent.targetUsers
      : [deptLabel ? `${deptLabel}相关人员` : null, `${businessLabel}相关人员`, '需要完成多步骤业务任务的使用者'],
  );
  const boundaries = nonEmpty(
    agent.capabilityBoundaries?.length
      ? agent.capabilityBoundaries
      : [
          '生成结果用于辅助判断，正式业务使用前建议人工复核。',
          agent.visibility && agent.visibility !== 'public'
            ? `仅限${scopeLabel}范围内的授权用户使用。`
            : '使用时需遵循平台数据与安全规范。',
          canRun ? null : '当前不支持平台内在线体验，请下载资源包后按快速上手说明使用。',
        ],
  );
  const scenarios = nonEmpty([businessLabel, ...(agent.scenarioTags ?? [])]).slice(0, 5);
  const audienceFallback = targetUsers[0] || '业务人员';
  const cases = agent.cases?.length
    ? agent.cases
    : [
        caseFallback({
          agent,
          scenario: businessLabel,
          audience: audienceFallback,
          input: demoPrompt,
          output: outputExample,
        }),
      ];

  const environment = agent.environment;
  const platforms = nonEmpty(
    environment?.platforms?.length ? environment.platforms : ['MSS AI提效作战平台'],
  );
  const usageModes = nonEmpty(
    environment?.usageModes?.length
      ? environment.usageModes
      : [canRun ? '在线体验' : null, '下载资源包'],
  );
  const environmentRequirements = nonEmpty(
    environment?.requirements?.length
      ? environment.requirements
      : [
          '登录平台并具备对应内容访问权限',
          mountedSkills.length ? `已挂载 ${mountedSkills.length} 个 Skill` : '按资源包说明配置所需 Skill',
          '工作区已配置可用模型',
        ],
  );
  const configuration = nonEmpty(
    environment?.configuration?.length
      ? environment.configuration
      : [primarySkill ? `主 Skill：${skillDisplayName(primarySkill)}` : null, '运行前请确认输入材料不包含未授权敏感信息'],
  );

  const handleDownload = () => {
    bumpDownload(agent.id);
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
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                      {agent.published ? '已上架' : '试用中'}
                    </span>
                    <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-800">
                      {version}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-zinc-600">
                    {agent.desc || '暂无功能简介'}
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
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                  {businessLabel}
                </span>
                {platforms.slice(0, 2).map((platform) => (
                  <span key={platform} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                    {platform}
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
            {DETAIL_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11px] font-semibold transition',
                  tab === item.id
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700',
                )}
                aria-current={tab === item.id ? 'page' : undefined}
              >
                <i className={cn('fa-solid text-[10px]', item.icon)} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="min-h-[520px] bg-zinc-50/40 px-4 py-4 md:px-5 md:py-5">
            {tab === 'overview' ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <SectionCard title="核心能力" icon="fa-sparkles">
                    <BulletList items={capabilities.length ? capabilities : ['暂无核心能力说明']} />
                  </SectionCard>
                  <SectionCard title="适用对象" icon="fa-users">
                    <TagList items={targetUsers} />
                  </SectionCard>
                </div>
                <SectionCard title="能力边界" icon="fa-shield-halved" className="border-amber-100 bg-amber-50/35">
                  <BulletList items={boundaries} />
                </SectionCard>
                <SectionCard title="能力组成" icon="fa-cubes-stacked">
                  <p className="mb-3 text-[12px] leading-relaxed text-zinc-500">
                    Agent 通过编排多个 Skill 完成相对完整的业务任务；以下为当前挂载能力。
                  </p>
                  <TagList items={skillNames} empty="当前未挂载 Skill" />
                </SectionCard>
                {persona ? (
                  <details className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
                    <summary className="cursor-pointer text-[12px] font-semibold text-zinc-700">查看工作方式说明</summary>
                    <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-600">{persona}</p>
                  </details>
                ) : null}
              </div>
            ) : null}

            {tab === 'scenarios' ? (
              <div className="space-y-3">
                <div className="mb-4">
                  <h4 className="text-[15px] font-semibold tracking-tight text-zinc-900">适用场景</h4>
                  <p className="mt-1 text-[12px] text-zinc-500">选择与当前工作最接近的场景，再进入体验或下载资源包。</p>
                </div>
                {scenarios.map((scenario, index) => (
                  <section key={scenario} className="flex gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[12px] font-semibold text-sky-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h5 className="text-[13px] font-semibold text-zinc-900">{scenario}</h5>
                      <p className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                        当你需要完成{scenario}相关的多步骤任务时，可使用本 Agent 理解材料、编排能力并汇总可执行结果。
                      </p>
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {tab === 'input-output' ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <SectionCard title="输入要求" icon="fa-arrow-up-from-bracket">
                    <dl className="divide-y divide-zinc-100">
                      <MetaRow label="输入类型" value={nonEmpty(agent.inputOutput?.inputTypes).join('、') || '文本、文档或业务资料'} />
                      <MetaRow label="输入格式" value={agent.inputOutput?.inputFormat || '清晰说明任务目标、背景和约束条件'} />
                      <MetaRow label="输入字段" value={nonEmpty(agent.inputOutput?.inputFields).join('、') || '任务目标、业务背景、材料内容、期望结果'} />
                      <MetaRow label="支持文件" value={nonEmpty(agent.inputOutput?.supportedFiles).join('、') || '以快速上手与运行页面提示为准'} />
                    </dl>
                  </SectionCard>
                  <SectionCard title="输出说明" icon="fa-file-circle-check">
                    <dl className="divide-y divide-zinc-100">
                      <MetaRow label="输出格式" value={agent.inputOutput?.outputFormat || '结构化文本结果'} />
                      <MetaRow label="关键字段" value={nonEmpty(agent.inputOutput?.outputFields).join('、') || '结论、依据、风险、下一步行动'} />
                      <MetaRow label="业务使用" value={agent.inputOutput?.resultUsage || '复核后用于汇报、决策或后续任务执行'} />
                    </dl>
                  </SectionCard>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <ExampleBlock label="输入示例" value={demoPrompt} />
                  <ExampleBlock label="输出示例" value={outputExample || '运行 Agent 后将在任务中心生成结构化结果。'} />
                </div>
              </div>
            ) : null}

            {tab === 'guide' ? (
              <SectionCard title="七步快速上手" icon="fa-route">
                <div className="mt-1">
                  <GuideStep index={1} title="适用场景">
                    适合处理{businessLabel}相关任务，尤其是需要多个步骤或多个 Skill 协同完成的工作。
                  </GuideStep>
                  <GuideStep index={2} title="使用前准备">
                    <BulletList items={nonEmpty(agent.quickStart?.prerequisites).length ? nonEmpty(agent.quickStart?.prerequisites) : environmentRequirements} />
                  </GuideStep>
                  <GuideStep index={3} title="输入要求">
                    <BulletList
                      items={
                        nonEmpty(agent.quickStart?.inputRequirements).length
                          ? nonEmpty(agent.quickStart?.inputRequirements)
                          : ['说明任务目标与业务背景', '提供必要材料并标注数据口径', '明确期望输出格式与使用场景']
                      }
                    />
                  </GuideStep>
                  <GuideStep index={4} title="操作步骤">
                    {orchestrationSteps.length ? <BulletList items={orchestrationSteps} /> : '进入详情后点击立即体验，提交材料并按页面提示查看结果。'}
                  </GuideStep>
                  <GuideStep index={5} title="输出示例">
                    <ExampleBlock label="样例结果" value={outputExample || '运行后将生成结论、依据、风险与行动建议。'} />
                  </GuideStep>
                  <GuideStep index={6} title="导入 / 安装说明">
                    {agent.quickStart?.installGuide || environment?.packageGuide || '下载 Agent 资源包后，按包内 README 与 AGENT.md 完成导入和配置。'}
                  </GuideStep>
                  <GuideStep index={7} title="常见问题">
                    {agent.quickStart?.faqs?.length ? (
                      <div className="space-y-2">
                        {agent.quickStart.faqs.map((faq) => (
                          <details key={faq.question} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                            <summary className="cursor-pointer font-medium text-zinc-700">{faq.question}</summary>
                            <p className="mt-2 text-zinc-500">{faq.answer}</p>
                          </details>
                        ))}
                      </div>
                    ) : (
                      <BulletList items={['无法运行：确认是否有访问权限及可用模型。', '结果不符合预期：补充业务背景、数据口径和输出要求。', '仍有问题：使用右侧“反馈建议”生成反馈模板。']} />
                    )}
                  </GuideStep>
                </div>
              </SectionCard>
            ) : null}

            {tab === 'cases' ? (
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
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <ExampleBlock label="样例输入" value={item.input} />
                      <ExampleBlock label="样例输出" value={item.output} />
                    </div>
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
              </div>
            ) : null}

            {tab === 'version' ? (
              <div className="space-y-4">
                <SectionCard title="当前版本" icon="fa-code-branch">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[24px] font-semibold tracking-tight text-zinc-900">{version}</p>
                      <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-zinc-600">
                        {agent.versionSummary || `当前版本支持${businessLabel}相关任务，并可编排 ${mountedSkills.length} 个 Skill。`}
                      </p>
                    </div>
                    <span className={cn('w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold', agent.published ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
                      {agent.published ? '当前可用' : '试用状态'}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-x-6 border-t border-zinc-100 pt-2 sm:grid-cols-2">
                    <MetaRow label="更新时间" value={updatedAt} />
                    <MetaRow label="创建时间" value={createdAt} />
                    <MetaRow label="维护团队" value={maintainer} />
                    <MetaRow label="发布方" value={agent.publisher || agent.author} />
                  </dl>
                </SectionCard>
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center">
                  <i className="fa-solid fa-clock-rotate-left text-[16px] text-zinc-300" />
                  <p className="mt-2 text-[12px] font-medium text-zinc-600">历史版本将在完整产品版开放</p>
                  <p className="mt-1 text-[11px] text-zinc-400">当前 MVP 仅展示正在使用的版本。</p>
                </div>
              </div>
            ) : null}

            {tab === 'environment' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SectionCard title="平台与使用方式" icon="fa-laptop">
                  <dl className="divide-y divide-zinc-100">
                    <MetaRow label="适配平台" value={platforms.join('、')} />
                    <MetaRow label="使用方式" value={usageModes.join('、')} />
                    <MetaRow label="权限要求" value={scopeLabel} />
                    <MetaRow
                      label="代码能力"
                      value={environment?.requiresCode === undefined ? '以资源包说明为准' : environment.requiresCode ? '需要' : '不需要'}
                    />
                    <MetaRow
                      label="员工助手导入"
                      value={environment?.supportsAssistantImport === undefined ? '以资源包说明为准' : environment.supportsAssistantImport ? '支持' : '暂不支持'}
                    />
                  </dl>
                </SectionCard>
                <SectionCard title="环境与配置要求" icon="fa-sliders">
                  <p className="mb-2 text-[11px] font-semibold text-zinc-500">环境要求</p>
                  <BulletList items={environmentRequirements} />
                  {configuration.length ? (
                    <>
                      <p className="mb-2 mt-4 border-t border-zinc-100 pt-3 text-[11px] font-semibold text-zinc-500">配置要求</p>
                      <BulletList items={configuration} />
                    </>
                  ) : null}
                </SectionCard>
                <SectionCard title="资源包说明" icon="fa-box-open" className="md:col-span-2">
                  <p className="text-[12px] leading-relaxed text-zinc-600">
                    {environment?.packageGuide || '资源包包含 AGENT.md、编排计划、演示提示词和清单文件。下载后请先阅读 README，再按目标平台的导入方式完成配置。'}
                  </p>
                </SectionCard>
              </div>
            ) : null}
          </div>
        </main>

        <aside className="order-first border-b border-zinc-100 bg-white md:order-none md:border-b-0">
          <div className="space-y-4 p-4 md:sticky md:top-0">
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">开始使用</p>
              <button
                type="button"
                disabled={!canRun}
                onClick={() => canRun && onRun(agent)}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition',
                  canRun
                    ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                    : 'cursor-not-allowed bg-zinc-100 text-zinc-400',
                )}
              >
                <i className="fa-solid fa-play text-[10px]" />
                {canRun ? '立即体验' : '暂不支持在线体验'}
              </button>
              {!canRun ? (
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">可下载资源包后按教程使用，或先查看案例了解产出效果。</p>
              ) : null}
            </section>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
              <button type="button" onClick={handleDownload} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50">
                <i className="fa-solid fa-download text-[10px] text-zinc-400" />
                下载资源包
              </button>
              <button type="button" onClick={() => setTab('guide')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50">
                <i className="fa-solid fa-book-open text-[10px] text-zinc-400" />
                查看快速上手
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

            <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">关键状态</p>
              <dl className="divide-y divide-zinc-200/70">
                <MetaRow label="当前版本" value={version} />
                <MetaRow label="更新时间" value={updatedAt} />
                <MetaRow label="适配平台" value={platforms.join('、')} />
                <MetaRow label="开放范围" value={scopeLabel} />
                <MetaRow label="维护团队" value={maintainer} />
              </dl>
            </section>

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
