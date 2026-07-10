import { create } from 'zustand';
import { createTenantCatalog, WORKSPACE_LIST, type Workspace, type WorkspaceCatalog } from '@/domain/workspace';
import type { WorkspaceLocale } from '@/domain/workspaceLocale';
import {
  buildDefaultWorkspaceConfigs,
  configToWorkspace,
  isBuiltinTenantId,
  resolveWorkspaceDisplay,
  slugifyTenantId,
  type WorkspaceDisplayConfig,
} from '@/domain/workspaceConfig';

const LS_KEY = 'mssclaw_workspace_config';
const MEMBERS_LS_PREFIX = 'mssclaw_members_';

interface PersistedWorkspaceConfig {
  defaultWorkspaceId: string;
  items: WorkspaceDisplayConfig[];
}

function normalizeItem(row: Partial<WorkspaceDisplayConfig>, index: number, fallback?: WorkspaceDisplayConfig): WorkspaceDisplayConfig | null {
  if (!row?.id || typeof row.id !== 'string') return null;
  const custom = row.custom === true || (!isBuiltinTenantId(row.id) && !fallback);
  const base = fallback ?? {
    id: row.id,
    enabled: true,
    sortOrder: index,
    name: row.id,
    description: '',
    namespace: row.id.replace(/^ws-/, '').replace(/-/g, '.'),
    memberCount: 1,
    locale: 'zh-CN' as WorkspaceLocale,
    custom: true,
  };
  return {
    id: row.id,
    enabled: row.enabled !== false,
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : index,
    name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : base.name,
    description:
      typeof row.description === 'string' && row.description.trim()
        ? row.description.trim()
        : base.description,
    namespace:
      typeof row.namespace === 'string' && row.namespace.trim()
        ? row.namespace.trim()
        : base.namespace,
    memberCount:
      typeof row.memberCount === 'number' && row.memberCount >= 0 ? row.memberCount : base.memberCount,
    locale:
      row.locale === 'zh-CN' || row.locale === 'en' || row.locale === 'es' ? row.locale : base.locale,
    custom: custom || base.custom === true,
  };
}

function loadPersisted(): PersistedWorkspaceConfig {
  const defaults = buildDefaultWorkspaceConfigs();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      return { defaultWorkspaceId: 'ws-3c-latam', items: defaults };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceConfig>;
    const byId = new Map(defaults.map((d) => [d.id, d]));
    const items: WorkspaceDisplayConfig[] = [];
    const seen = new Set<string>();

    if (Array.isArray(parsed.items)) {
      parsed.items.forEach((row, index) => {
        if (!row?.id || seen.has(row.id)) return;
        const builtin = byId.get(row.id);
        const normalized = normalizeItem(row, index, builtin);
        if (!normalized) return;
        items.push(normalized);
        seen.add(row.id);
        byId.delete(row.id);
      });
    }

    byId.forEach((d) => {
      if (!seen.has(d.id)) items.push(d);
    });

    const defaultWorkspaceId =
      typeof parsed.defaultWorkspaceId === 'string' &&
      items.some((i) => i.id === parsed.defaultWorkspaceId && i.enabled)
        ? parsed.defaultWorkspaceId
        : items.find((i) => i.enabled)?.id ?? 'ws-3c-latam';

    return { defaultWorkspaceId, items: items.sort((a, b) => a.sortOrder - b.sortOrder) };
  } catch {
    return { defaultWorkspaceId: 'ws-3c-latam', items: defaults };
  }
}

function persist(state: PersistedWorkspaceConfig) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function itemToWorkspace(cfg: WorkspaceDisplayConfig): Workspace {
  const base = WORKSPACE_LIST.find((w) => w.id === cfg.id);
  return base ? resolveWorkspaceDisplay(base, cfg) : configToWorkspace(cfg);
}

function buildCatalogsFromItems(items: WorkspaceDisplayConfig[]): Record<string, WorkspaceCatalog> {
  const catalogs: Record<string, WorkspaceCatalog> = {};
  items.forEach((cfg) => {
    if (cfg.custom || !isBuiltinTenantId(cfg.id)) {
      catalogs[cfg.id] = createTenantCatalog({
        id: cfg.id,
        name: cfg.name,
        namespace: cfg.namespace,
        description: cfg.description,
        memberCount: cfg.memberCount,
      });
    }
  });
  return catalogs;
}

function syncWorkspaceList(state: PersistedWorkspaceConfig) {
  void import('@/stores/workspaceStore').then(({ useWorkspaceStore }) => {
    const list = state.items
      .filter((i) => i.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(itemToWorkspace);

    const customCatalogs = buildCatalogsFromItems(state.items);
    useWorkspaceStore.setState((prev) => {
      const nextCatalogs = { ...prev.catalogs };
      // 刷新自定义租户 catalog 元数据；移除已删除的自定义
      Object.keys(nextCatalogs).forEach((id) => {
        if (!isBuiltinTenantId(id) && !state.items.some((i) => i.id === id)) {
          delete nextCatalogs[id];
        }
      });
      Object.assign(nextCatalogs, customCatalogs);
      return {
        workspaceList: list.length ? list : WORKSPACE_LIST,
        catalogs: nextCatalogs,
      };
    });
  });
}

function ensureActiveWorkspace(state: PersistedWorkspaceConfig) {
  void import('@/stores/workspaceStore').then(({ useWorkspaceStore }) => {
    void import('@/stores/conversationStore').then(({ useConversationStore }) => {
      const { workspaceId, switchWorkspace } = useWorkspaceStore.getState();
      const enabled = state.items.filter((i) => i.enabled);
      const currentOk = enabled.some((i) => i.id === workspaceId);
      if (!currentOk) {
        const nextId = enabled.some((i) => i.id === state.defaultWorkspaceId)
          ? state.defaultWorkspaceId
          : enabled[0]?.id ?? state.defaultWorkspaceId;
        const defaultChatId = switchWorkspace(nextId);
        useConversationStore.getState().loadWorkspace(nextId, defaultChatId);
        useConversationStore.setState({
          pushToast: `当前租户已不可用，已切换到「${state.items.find((i) => i.id === nextId)?.name ?? nextId}」`,
        });
      }
    });
  });
}

function clearTenantLocalData(id: string) {
  try {
    localStorage.removeItem(`${MEMBERS_LS_PREFIX}${id}`);
  } catch {
    /* ignore */
  }
}

export interface AddTenantInput {
  name: string;
  namespace?: string;
  description?: string;
  locale?: WorkspaceLocale;
  memberCount?: number;
}

interface WorkspaceConfigState extends PersistedWorkspaceConfig {
  getConfig: (id: string) => WorkspaceDisplayConfig | undefined;
  getAllConfigs: () => WorkspaceDisplayConfig[];
  getVisibleWorkspaces: () => Workspace[];
  resolveWorkspace: (base: Workspace) => Workspace;
  getLocale: (workspaceId: string) => WorkspaceLocale;
  isEnabled: (workspaceId: string) => boolean;
  getDefaultWorkspaceId: () => string;
  setDefaultWorkspaceId: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  updateWorkspace: (id: string, patch: Partial<Omit<WorkspaceDisplayConfig, 'id' | 'custom'>>) => void;
  moveWorkspace: (id: string, direction: 'up' | 'down') => void;
  addTenant: (input: AddTenantInput) => string | null;
  removeTenant: (id: string) => boolean;
  resetToDefaults: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  enabledCount: () => number;
  getCustomCatalogs: () => Record<string, WorkspaceCatalog>;
}

export const useWorkspaceConfigStore = create<WorkspaceConfigState>((set, get) => {
  const initial = loadPersisted();

  return {
    ...initial,

    getConfig: (id) => get().items.find((i) => i.id === id),

    getAllConfigs: () => [...get().items].sort((a, b) => a.sortOrder - b.sortOrder),

    getVisibleWorkspaces: () => {
      const visible = get()
        .items.filter((i) => i.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(itemToWorkspace);
      return visible.length ? visible : WORKSPACE_LIST;
    },

    resolveWorkspace: (base) => {
      const cfg = get().getConfig(base.id);
      if (!cfg) return base;
      return resolveWorkspaceDisplay(base, cfg);
    },

    getLocale: (workspaceId) => get().getConfig(workspaceId)?.locale ?? 'zh-CN',

    isEnabled: (workspaceId) => get().getConfig(workspaceId)?.enabled !== false,

    getDefaultWorkspaceId: () => {
      const { defaultWorkspaceId, items } = get();
      if (items.some((i) => i.id === defaultWorkspaceId && i.enabled)) return defaultWorkspaceId;
      return items.find((i) => i.enabled)?.id ?? defaultWorkspaceId;
    },

    setDefaultWorkspaceId: (id) => {
      if (!get().items.some((i) => i.id === id && i.enabled)) return;
      const next = { ...get(), defaultWorkspaceId: id };
      persist(next);
      set({ defaultWorkspaceId: id });
    },

    setEnabled: (id, on) => {
      const enabledCount = get().items.filter((i) => i.enabled).length;
      if (!on && enabledCount <= 1) return;

      const items = get().items.map((i) => (i.id === id ? { ...i, enabled: on } : i));
      const enabledItems = items.filter((i) => i.enabled);
      let defaultWorkspaceId = get().defaultWorkspaceId;
      if (!enabledItems.some((i) => i.id === defaultWorkspaceId)) {
        defaultWorkspaceId = enabledItems[0]?.id ?? defaultWorkspaceId;
      }
      const next = { defaultWorkspaceId, items };
      persist(next);
      set(next);
      syncWorkspaceList(next);
      if (!on) ensureActiveWorkspace(next);
    },

    updateWorkspace: (id, patch) => {
      const items = get().items.map((i) => (i.id === id ? { ...i, ...patch, id, custom: i.custom } : i));
      const next = { ...get(), items };
      persist(next);
      set({ items });
      syncWorkspaceList(next);
    },

    moveWorkspace: (id, direction) => {
      const sorted = [...get().items].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = sorted.findIndex((i) => i.id === id);
      if (index < 0) return;
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return;
      const reordered = sorted.map((item, idx) => {
        if (idx === index) return { ...item, sortOrder: swapWith };
        if (idx === swapWith) return { ...item, sortOrder: index };
        return { ...item, sortOrder: idx };
      });
      const next = { ...get(), items: reordered };
      persist(next);
      set({ items: reordered });
      syncWorkspaceList(next);
    },

    addTenant: (input) => {
      const name = input.name.trim();
      if (!name) return null;

      const existingIds = new Set(get().items.map((i) => i.id));
      let id = slugifyTenantId(name);
      if (existingIds.has(id)) {
        let n = 2;
        while (existingIds.has(`${id}-${n}`)) n += 1;
        id = `${id}-${n}`;
      }

      const namespace =
        input.namespace?.trim() ||
        id.replace(/^ws-/, '').replace(/-/g, '.');
      const maxOrder = get().items.reduce((m, i) => Math.max(m, i.sortOrder), -1);
      const item: WorkspaceDisplayConfig = {
        id,
        enabled: true,
        sortOrder: maxOrder + 1,
        name,
        description: input.description?.trim() || `${name} 租户空间`,
        namespace,
        memberCount: input.memberCount ?? 1,
        locale: input.locale ?? 'zh-CN',
        custom: true,
      };

      const items = [...get().items, item];
      const next = { ...get(), items };
      persist(next);
      set({ items });
      syncWorkspaceList(next);
      return id;
    },

    removeTenant: (id) => {
      const target = get().items.find((i) => i.id === id);
      if (!target) return false;
      if (!target.custom && isBuiltinTenantId(id)) return false;
      if (get().items.length <= 1) return false;

      const items = get().items.filter((i) => i.id !== id);
      const enabledItems = items.filter((i) => i.enabled);
      let defaultWorkspaceId = get().defaultWorkspaceId;
      if (!enabledItems.some((i) => i.id === defaultWorkspaceId)) {
        defaultWorkspaceId = enabledItems[0]?.id ?? items[0]?.id ?? defaultWorkspaceId;
      }
      const next = { defaultWorkspaceId, items };
      clearTenantLocalData(id);
      persist(next);
      set(next);
      syncWorkspaceList(next);
      ensureActiveWorkspace(next);
      return true;
    },

    resetToDefaults: () => {
      const next = { defaultWorkspaceId: 'ws-3c-latam', items: buildDefaultWorkspaceConfigs() };
      persist(next);
      set(next);
      syncWorkspaceList(next);
      ensureActiveWorkspace(next);
    },

    exportConfig: () => {
      const { defaultWorkspaceId, items } = get();
      return JSON.stringify({ defaultWorkspaceId, items }, null, 2);
    },

    importConfig: (json) => {
      try {
        const parsed = JSON.parse(json) as Partial<PersistedWorkspaceConfig>;
        const defaults = buildDefaultWorkspaceConfigs();
        const byBuiltin = new Map(defaults.map((d) => [d.id, d]));
        const items: WorkspaceDisplayConfig[] = [];
        const seen = new Set<string>();

        if (Array.isArray(parsed.items)) {
          parsed.items.forEach((row, index) => {
            if (!row?.id || seen.has(row.id)) return;
            const normalized = normalizeItem(row, index, byBuiltin.get(row.id));
            if (!normalized) return;
            items.push(normalized);
            seen.add(row.id);
            byBuiltin.delete(row.id);
          });
        }

        byBuiltin.forEach((d) => {
          if (!seen.has(d.id)) items.push(d);
        });

        if (!items.length) return false;

        let defaultWorkspaceId =
          typeof parsed.defaultWorkspaceId === 'string' ? parsed.defaultWorkspaceId : 'ws-3c-latam';
        if (!items.some((i) => i.id === defaultWorkspaceId && i.enabled)) {
          defaultWorkspaceId = items.find((i) => i.enabled)?.id ?? items[0].id;
        }

        const next = {
          defaultWorkspaceId,
          items: items.sort((a, b) => a.sortOrder - b.sortOrder),
        };
        persist(next);
        set(next);
        syncWorkspaceList(next);
        ensureActiveWorkspace(next);
        return true;
      } catch {
        return false;
      }
    },

    enabledCount: () => get().items.filter((i) => i.enabled).length,

    getCustomCatalogs: () => buildCatalogsFromItems(get().items),
  };
});
