import { create } from 'zustand';
import {
  AUDIT_CATEGORY_LABELS,
  type AuditCategory,
  type AuditLogEntry,
} from '@/domain/auditLog';
import type { DeptId, RegionId } from '@/domain/orgTaxonomy';
import { type PlatformRole } from '@/domain/rbac';
import { useSessionStore } from '@/stores/sessionStore';
import { useDataFetchNotice } from '@/domain/dataFetchNotice';
import {
  canUsePlatformDocsApi,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

const MAX_LOGS = 400;

function emptyLogs(): AuditLogEntry[] {
  return [];
}

export interface RecordAuditInput {
  category: AuditCategory;
  action: string;
  module: string;
  detail: string;
  /** 覆盖当前会话用户（如登录前失败、或代操作） */
  userName?: string;
  userEmail?: string;
  role?: PlatformRole;
  deptIds?: DeptId[];
  regionId?: RegionId | null;
}

function persist(logs: AuditLogEntry[]) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc('audit-log', {
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
  logs: emptyLogs(),
  filter: 'all',

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        useDataFetchNotice.getState().markFailed();
        set({ logs: emptyLogs() });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ logs?: AuditLogEntry[] }>('audit-log',
        );
        const list = Array.isArray(remote?.logs) ? remote.logs : [];
        set({ logs: list.slice(0, MAX_LOGS) });
      } catch {
        useDataFetchNotice.getState().markFailed();
        set({ logs: emptyLogs() });
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
