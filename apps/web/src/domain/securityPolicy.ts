import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
  peekPlatformDocMemory,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

export type SkillScanGateMode = 'off' | 'warn' | 'block';

export interface SecurityPolicy {
  piiMask: boolean;
  auditLog: boolean;
  skillWhitelist: boolean;
  /** Skill 上架安全扫描门禁：off / warn / block */
  skillScanGate: SkillScanGateMode;
}

const DOC_KIND = 'security-policy' as const;
const LEGACY_SCAN_GATE_KEY = 'mssclaw_skill_scan_gate';

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  piiMask: true,
  auditLog: true,
  skillWhitelist: true,
  skillScanGate: 'off',
};

function normalizeGate(raw: unknown): SkillScanGateMode {
  return raw === 'warn' || raw === 'block' || raw === 'off' ? raw : 'off';
}

function normalize(raw: Partial<SecurityPolicy> | null | undefined): SecurityPolicy {
  return {
    piiMask: raw?.piiMask !== false,
    auditLog: raw?.auditLog !== false,
    skillWhitelist: raw?.skillWhitelist !== false,
    skillScanGate: normalizeGate(raw?.skillScanGate),
  };
}

/** 一次性清掉旧 localStorage 门禁，并迁入内存（随后随 security-policy 落库） */
function consumeLegacyScanGate(): SkillScanGateMode | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const v = localStorage.getItem(LEGACY_SCAN_GATE_KEY);
    localStorage.removeItem(LEGACY_SCAN_GATE_KEY);
    if (v === 'off' || v === 'warn' || v === 'block') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function loadSecurityPolicy(): SecurityPolicy {
  const mem = peekPlatformDocMemory<Partial<SecurityPolicy>>(
    currentWorkspaceId(),
    DOC_KIND,
  );
  const base = normalize(mem);
  if (mem && typeof mem.skillScanGate !== 'undefined') {
    return base;
  }
  const legacy = consumeLegacyScanGate();
  if (legacy) {
    const next = { ...base, skillScanGate: legacy };
    setPlatformDocMemory(currentWorkspaceId(), DOC_KIND, next);
    if (canUsePlatformDocsApi()) {
      void scheduleSavePlatformDoc(currentWorkspaceId(), DOC_KIND, next);
    }
    return next;
  }
  return base;
}

export function saveSecurityPolicy(patch: Partial<SecurityPolicy>) {
  const next = { ...loadSecurityPolicy(), ...patch };
  const ws = currentWorkspaceId();
  setPlatformDocMemory(ws, DOC_KIND, next);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(ws, DOC_KIND, next);
}

export async function hydrateSecurityPolicy(workspaceId?: string): Promise<void> {
  const ws = workspaceId || currentWorkspaceId();
  if (!canUsePlatformDocsApi()) return;
  try {
    const remote = await fetchPlatformDoc<Partial<SecurityPolicy>>(ws, DOC_KIND);
    const normalized = normalize(remote);
    // 远端未带 skillScanGate 时，保留本机会话已迁入的门禁
    const prev = peekPlatformDocMemory<Partial<SecurityPolicy>>(ws, DOC_KIND);
    if (
      remote &&
      typeof remote.skillScanGate === 'undefined' &&
      prev &&
      typeof prev.skillScanGate !== 'undefined'
    ) {
      normalized.skillScanGate = normalizeGate(prev.skillScanGate);
    }
    setPlatformDocMemory(ws, DOC_KIND, normalized);
  } catch {
    /* keep defaults */
  }
}
