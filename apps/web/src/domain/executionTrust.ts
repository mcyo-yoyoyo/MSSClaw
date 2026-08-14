/**
 * 2.0 执行可信度分层：演示 / 平台模型 / 自配模型 / 仅下载
 * 用于 Skill/Agent Hub 卡片与详情，避免「点了像真跑、实际没跑」毁信任。
 */

export type ExecutionTrustTier =
  | 'demo'
  | 'platform'
  | 'self_configured'
  | 'download_only';

export const EXECUTION_TRUST_META: Record<
  ExecutionTrustTier,
  { label: string; hint: string; badgeClass: string }
> = {
  demo: {
    label: '演示',
    hint: '走平台演示打样链路，结果供体验参考，不等同生产业务跑批。',
    badgeClass: 'bg-amber-50 text-amber-800',
  },
  platform: {
    label: '平台模型',
    hint: '在 AI 任务中调用平台托管能力；受模型配额与当前部署约束。',
    badgeClass: 'bg-emerald-50 text-emerald-800',
  },
  self_configured: {
    label: '自配模型',
    hint: '依赖体外环境清单或自行配置的模型/工具；平台内仅为参照或辅助。',
    badgeClass: 'bg-sky-50 text-sky-800',
  },
  download_only: {
    label: '仅下载',
    hint: '当前不可站内试用（MVP / 无权限 / 未挂载打样）。请先下载学习包。',
    badgeClass: 'bg-zinc-100 text-zinc-600',
  },
};

/** Skill：可站内 invoke → 平台模型；否则仅下载 */
export function resolveSkillExecutionTrust(canRun: boolean): ExecutionTrustTier {
  return canRun ? 'platform' : 'download_only';
}

/**
 * Agent / 场景方案：
 * - 可跑演示计划 → 演示（有环境清单时标自配倾向）
 * - 否则仅下载
 */
export function resolveAgentExecutionTrust(opts: {
  canRun: boolean;
  hasDemoPlan: boolean;
  /** 场景含体外环境参照清单 */
  envFilled?: boolean;
}): ExecutionTrustTier {
  if (!opts.canRun || !opts.hasDemoPlan) return 'download_only';
  if (opts.envFilled) return 'self_configured';
  return 'demo';
}

export function executionTrustBlockedMessage(
  tier: ExecutionTrustTier,
  detail?: string,
): string {
  const base = EXECUTION_TRUST_META[tier].hint;
  return detail ? `${detail}（${EXECUTION_TRUST_META[tier].label}）` : base;
}

/** 执行失败时的可解释文案 */
export function executionTrustFailMessage(tier: ExecutionTrustTier): string {
  switch (tier) {
    case 'demo':
      return '演示执行未完成。可打开任务记录查看原因，或改用「下载」自学。';
    case 'platform':
      return '平台试用未启动。请确认已登录、具备执行权限，且会话已就绪；也可先下载学习。';
    case 'self_configured':
      return '自配路径未能直接开跑。请按环境清单自行配齐后重试，或先下载学习包。';
    default:
      return EXECUTION_TRUST_META.download_only.hint;
  }
}
