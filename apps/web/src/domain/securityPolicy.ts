import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
  peekPlatformDocMemory,
  setPlatformDocMemory,
} from '@/api/platformDocsApi';

export interface SecurityPolicy {
  piiMask: boolean;
  auditLog: boolean;
  skillWhitelist: boolean;
}

const DOC_KIND = 'security-policy' as const;

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  piiMask: true,
  auditLog: true,
  skillWhitelist: true,
};

function normalize(raw: Partial<SecurityPolicy> | null | undefined): SecurityPolicy {
  return {
    piiMask: raw?.piiMask !== false,
    auditLog: raw?.auditLog !== false,
    skillWhitelist: raw?.skillWhitelist !== false,
  };
}

export function loadSecurityPolicy(): SecurityPolicy {
  const mem = peekPlatformDocMemory<Partial<SecurityPolicy>>(
    currentWorkspaceId(),
    DOC_KIND,
  );
  return normalize(mem);
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
    setPlatformDocMemory(ws, DOC_KIND, normalize(remote));
  } catch {
    /* keep defaults */
  }
}
