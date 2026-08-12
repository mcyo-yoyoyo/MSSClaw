/** Skill 安全扫描状态与上架门禁（局域网可关；对接 IT 后可切 block） */

import { loadSecurityPolicy, saveSecurityPolicy } from '@/domain/securityPolicy';
import type { SkillScanGateMode } from '@/domain/securityPolicy';

export type SkillSecurityScanStatus =
  | 'not_connected'
  | 'pending'
  | 'passed'
  | 'failed';

export type SkillSecurityScanGateMode = SkillScanGateMode;

export type SkillSecurityScanState = {
  status: SkillSecurityScanStatus;
  reportNote?: string;
  scannedAt?: string;
};

export type SkillSecurityScanView = {
  status: SkillSecurityScanStatus;
  title: string;
  summary: string;
  dimensions: { id: string; label: string; hint: string }[];
};

const DIMENSIONS = [
  {
    id: 'poison',
    label: 'Skill 投毒检测',
    hint: '检测技能包篡改、恶意指令与供应链风险',
  },
  {
    id: 'kia',
    label: 'KIA 检测',
    hint: '对接公司 IT 合规与知识安全能力',
  },
] as const;

/** 读取门禁：优先环境变量，其次平台 security-policy（后端），默认 off */
export function getSecurityScanGateMode(): SkillSecurityScanGateMode {
  try {
    const env = (import.meta as { env?: Record<string, string> }).env?.VITE_SKILL_SCAN_GATE;
    if (env === 'off' || env === 'warn' || env === 'block') return env;
  } catch {
    /* ignore */
  }
  return loadSecurityPolicy().skillScanGate;
}

export function setSecurityScanGateMode(mode: SkillSecurityScanGateMode) {
  saveSecurityPolicy({ skillScanGate: mode });
}

export function skillSecurityStatusLabel(status: SkillSecurityScanStatus): string {
  switch (status) {
    case 'passed':
      return '无风险';
    case 'pending':
      return '检测中';
    case 'failed':
      return '检测失败';
    default:
      return '未上线';
  }
}

export function resolveSkillSecurityScan(
  scan?: SkillSecurityScanState | null,
): SkillSecurityScanView {
  const status = scan?.status ?? 'not_connected';
  if (status === 'not_connected') {
    return {
      status,
      title: '未上线 · 待对接',
      summary:
        '安全扫描模块已预留。当前局域网版本尚未对接公司 IT 安全能力；门禁默认关闭，可在配置中切换为告警或拦截。',
      dimensions: DIMENSIONS.map((d) => ({ ...d })),
    };
  }
  if (status === 'pending') {
    return {
      status,
      title: '检测中',
      summary: '安全扫描进行中，暂不建议对外上架。' + (scan?.reportNote ? ` ${scan.reportNote}` : ''),
      dimensions: DIMENSIONS.map((d) => ({ ...d })),
    };
  }
  if (status === 'failed') {
    return {
      status,
      title: '检测失败 · 需整改',
      summary: scan?.reportNote || '未通过安全扫描，请整改后重检再发起上架 / 更新审批。',
      dimensions: DIMENSIONS.map((d) => ({ ...d })),
    };
  }
  return {
    status: 'passed',
    title: '无风险',
    summary: scan?.reportNote || '已通过 Skill 投毒检测与 KIA 检测（演示态）。',
    dimensions: DIMENSIONS.map((d) => ({ ...d })),
  };
}

/** @deprecated 使用 resolveSkillSecurityScan */
export function getSkillSecurityScanPlaceholder(): SkillSecurityScanView {
  return resolveSkillSecurityScan(null);
}

export function assertSkillScanAllowsApproval(scan?: SkillSecurityScanState | null): {
  ok: boolean;
  mode: SkillSecurityScanGateMode;
  message?: string;
} {
  const mode = getSecurityScanGateMode();
  const status = scan?.status ?? 'not_connected';
  if (mode === 'off') return { ok: true, mode };
  if (status === 'passed') return { ok: true, mode };
  if (mode === 'warn') {
    return {
      ok: true,
      mode,
      message: `安全扫描状态为「${skillSecurityStatusLabel(status)}」（门禁=告警，仍可提交）`,
    };
  }
  return {
    ok: false,
    mode,
    message: `安全扫描未通过（${skillSecurityStatusLabel(status)}），门禁已开启，禁止发起上架 / 更新审批`,
  };
}
