export interface SecurityPolicy {
  piiMask: boolean;
  auditLog: boolean;
  skillWhitelist: boolean;
}

const LS_PREFIX = 'mssclaw_security_';

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  piiMask: true,
  auditLog: true,
  skillWhitelist: true,
};

export function loadSecurityPolicy(): SecurityPolicy {
  return {
    piiMask: localStorage.getItem(`${LS_PREFIX}pii`) !== 'false',
    auditLog: localStorage.getItem(`${LS_PREFIX}audit`) !== 'false',
    skillWhitelist: localStorage.getItem(`${LS_PREFIX}whitelist`) !== 'false',
  };
}

export function saveSecurityPolicy(patch: Partial<SecurityPolicy>) {
  if (patch.piiMask != null) localStorage.setItem(`${LS_PREFIX}pii`, String(patch.piiMask));
  if (patch.auditLog != null) localStorage.setItem(`${LS_PREFIX}audit`, String(patch.auditLog));
  if (patch.skillWhitelist != null) {
    localStorage.setItem(`${LS_PREFIX}whitelist`, String(patch.skillWhitelist));
  }
}
