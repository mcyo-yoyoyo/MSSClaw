import { create } from 'zustand';
import type {
  AssetApprovalKind,
  AssetApprovalReason,
  AssetApprovalRequest,
} from '@/domain/assetApproval';
import { getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

export type AssetApprovalRecord = AssetApprovalRequest & {
  id: string;
  status: 'pending' | 'approved' | 'cancelled';
  updatedAt: number;
  decidedAt?: number;
};

interface AssetApprovalState {
  current: AssetApprovalRequest | null;
  history: AssetApprovalRecord[];
  hydrate: () => void;
  openApproval: (input: Omit<AssetApprovalRequest, 'stepIndex' | 'createdAt' | 'submitterName'> & {
    submitterName?: string;
    reasons?: AssetApprovalReason[];
  }) => void;
  advance: () => void;
  close: () => void;
}

function applyApproval(kind: AssetApprovalKind, assetId: string, reasons: AssetApprovalReason[]) {
  const market = useMarketplaceStore.getState();
  const wantPublish = reasons.includes('publish_executable') || reasons.length === 0;
  const wantPublic = reasons.includes('visibility_public');

  if (kind === 'agent') {
    const agent = market.agents.find((a) => a.id === assetId);
    if (agent) {
      market.upsertAgent({
        ...agent,
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  } else if (kind === 'skill') {
    const skill = market.skills.find((s) => s.id === assetId);
    if (skill) {
      market.upsertSkill({
        ...skill,
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  } else if (kind === 'tool') {
    const tool = market.tools.find((t) => t.id === assetId);
    if (tool) {
      market.upsertTool({
        ...tool,
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  } else if (kind === 'kb') {
    const doc = market.kbDocs.find((d) => d.id === assetId);
    if (doc) market.upsertKbDoc({ ...doc, indexed: true });
  } else if (kind === 'automation') {
    const auto = market.automations.find((a) => a.id === assetId);
    if (auto) market.upsertAutomation({ ...auto, enabled: true });
  } else if (kind === 'portal') {
    const portal = usePortalContentStore.getState();
    const item = portal.items.find((i) => i.id === assetId);
    if (item) {
      portal.upsertItem({
        ...item,
        ...(wantPublish ? { published: true } : {}),
        ...(wantPublic ? { visibility: 'public' as const } : {}),
      });
    }
  }
}

function persistHistory(items: AssetApprovalRecord[]) {
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'asset-approvals', {
    items: items.slice(0, 200),
  });
}

function newId() {
  return `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useAssetApprovalStore = create<AssetApprovalState>((set, get) => ({
  current: null,
  history: [],

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        set({ history: [] });
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ items?: AssetApprovalRecord[] }>(
          currentWorkspaceId(),
          'asset-approvals',
        );
        const items = Array.isArray(remote?.items) ? remote.items : [];
        set({ history: items.slice(0, 200) });
      } catch {
        set({ history: [] });
      }
    })();
  },

  openApproval: (input) => {
    const now = Date.now();
    const req: AssetApprovalRequest = {
      kind: input.kind,
      assetId: input.assetId,
      assetName: input.assetName,
      submitterName: input.submitterName || getCurrentUserName() || '未知用户',
      stepIndex: 1,
      createdAt: now,
      reasons: input.reasons?.length ? input.reasons : ['publish_executable'],
    };
    const record: AssetApprovalRecord = {
      ...req,
      id: newId(),
      status: 'pending',
      updatedAt: now,
    };
    const history = [record, ...get().history].slice(0, 200);
    persistHistory(history);
    set({ current: req, history });
  },

  advance: () => {
    const cur = get().current;
    if (!cur) return;
    const next = cur.stepIndex + 1;
    if (next >= 3) {
      const reasons = cur.reasons?.length ? cur.reasons : (['publish_executable'] as AssetApprovalReason[]);
      applyApproval(cur.kind, cur.assetId, reasons);
      const now = Date.now();
      const history = get().history.map((h) =>
        h.assetId === cur.assetId &&
        h.kind === cur.kind &&
        h.status === 'pending' &&
        Math.abs(h.createdAt - cur.createdAt) < 5000
          ? { ...h, stepIndex: 3, status: 'approved' as const, updatedAt: now, decidedAt: now }
          : h,
      );
      // If no matching pending (edge), append approved
      const hasMatch = history.some(
        (h) => h.assetId === cur.assetId && h.kind === cur.kind && h.status === 'approved' && h.decidedAt === now,
      );
      const nextHistory = hasMatch
        ? history
        : [
            {
              ...cur,
              id: newId(),
              stepIndex: 3,
              status: 'approved' as const,
              updatedAt: now,
              decidedAt: now,
            },
            ...history,
          ].slice(0, 200);
      persistHistory(nextHistory);
      useMarketplaceStore.getState().showToast(`「${cur.assetName}」已通过上架审批`);
      set({ current: null, history: nextHistory });
      return;
    }
    const updated: AssetApprovalRequest = { ...cur, stepIndex: next };
    const history = get().history.map((h) =>
      h.assetId === cur.assetId &&
      h.kind === cur.kind &&
      h.status === 'pending' &&
      Math.abs(h.createdAt - cur.createdAt) < 5000
        ? { ...h, stepIndex: next, updatedAt: Date.now() }
        : h,
    );
    persistHistory(history);
    set({ current: updated, history });
  },

  close: () => {
    const cur = get().current;
    if (cur) {
      const history = get().history.map((h) =>
        h.assetId === cur.assetId &&
        h.kind === cur.kind &&
        h.status === 'pending' &&
        Math.abs(h.createdAt - cur.createdAt) < 5000
          ? { ...h, status: 'cancelled' as const, updatedAt: Date.now() }
          : h,
      );
      persistHistory(history);
      set({ current: null, history });
      return;
    }
    set({ current: null });
  },
}));
