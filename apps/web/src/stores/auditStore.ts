import { create } from 'zustand';
import {
  AUDIT_CATEGORY_LABELS,
  SEED_AUDIT_LOGS,
  type AuditCategory,
  type AuditLogEntry,
} from '@/domain/auditLog';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import { SEED_MEMBERS, type PlatformRole } from '@/domain/rbac';
import { useSessionStore } from '@/stores/sessionStore';
import { isDemoContentEnabled } from '@/domain/demoContentPolicy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

const MAX_LOGS = 400;

function emptyOrSeedLogs(): AuditLogEntry[] {
  return isDemoContentEnabled() ? [...SEED_AUDIT_LOGS] : [];
}

/** 旧日志缺少组织轴时，按邮箱从种子成员补全，便于筛选 */
function enrichOrgFields(entry: AuditLogEntry): AuditLogEntry {
  if ((entry.deptIds?.length ?? 0) > 0 || entry.regionId) return entry;
  const email = entry.userEmail?.toLowerCase();
  if (!email) return entry;
  const member = SEED_MEMBERS.find((m) => m.email.toLowerCase() === email);
  if (!member) return entry;
  return {
    ...entry,
    deptIds: entry.deptIds?.length ? entry.deptIds : [...(member.deptIds ?? [])],
    regionId: entry.regionId !== undefined ? entry.regionId : (member.regionId ?? null),
  };
}

export interface RecordAuditInput {
  category: AuditCategory;
  action: string;
  module: string;
  detail: string;
  workspaceId?: string;
  /** 覆盖当前会话用户（如登录前失败、或代操作） */
  userName?: string;
  userEmail?: string;
  role?: PlatformRole;
  deptIds?: DeptId[];
  regionId?: RegionId | null;
}

function persist(logs: AuditLogEntry[]) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'audit-log', {
    logs: logs.slice(0, MAX_LOGS),
  });
}

interface AuditState {
  logs: AuditLogEntry[];
  filter: AuditCategory | 'all';
  hydrate: () => void;
  setFilter: (filter: AuditCategory | 'all') => void;
  record: (input: RecordAuditInput) => void;
  clearLogs: () => void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: emptyOrSeedLogs(),
  filter: 'all',

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ logs: emptyOrSeedLogs() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ logs?: AuditLogEntry[] }>(
          currentWorkspaceId(),
          'audit-log',
        );
        const list = Array.isArray(remote?.logs) ? remote.logs : [];
        set({
          logs: list.length
            ? list.map(enrichOrgFields).slice(0, MAX_LOGS)
            : emptyOrSeedLogs(),
        });
      } catch {
        set({ logs: emptyOrSeedLogs() });
      }
    })();
  },

  setFilter: (filter) => set({ filter }),

  record: (input) => {
    const session = useSessionStore.getState().user;
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      category: input.category,
      action: input.action,
      module: input.module,
      detail: input.detail,
      userName: input.userName ?? session?.name ?? '系统',
      userEmail: input.userEmail ?? session?.email,
      role: input.role ?? session?.platformRole,
      workspaceId: input.workspaceId,
      deptIds: input.deptIds ?? session?.deptIds ?? [],
      regionId:
        input.regionId !== undefined ? input.regionId : (session?.regionId ?? null),
    };
    const logs = [entry, ...get().logs].slice(0, MAX_LOGS);
    persist(logs);
    set({ logs });
  },

  clearLogs: () => {
    persist([]);
    set({ logs: [] });
  },
}));

/** 非 React 调用入口（stores / domain） */
export function recordAudit(input: RecordAuditInput) {
  useAuditStore.getState().record(input);
}

export { AUDIT_CATEGORY_LABELS };
