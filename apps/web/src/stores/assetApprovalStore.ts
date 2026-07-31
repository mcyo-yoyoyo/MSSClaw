import { create } from 'zustand';
import type {
  AssetApprovalKind,
  AssetApprovalReason,
  AssetApprovalRequest,
} from '@/domain/assetApproval';
import { getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface AssetApprovalState {
  current: AssetApprovalRequest | null;
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
  }
}

export const useAssetApprovalStore = create<AssetApprovalState>((set, get) => ({
  current: null,

  openApproval: (input) => {
    set({
      current: {
        kind: input.kind,
        assetId: input.assetId,
        assetName: input.assetName,
        submitterName: input.submitterName || getCurrentUserName() || '????',
        stepIndex: 1,
        createdAt: Date.now(),
        reasons: input.reasons?.length ? input.reasons : ['publish_executable'],
      },
    });
  },

  advance: () => {
    const cur = get().current;
    if (!cur) return;
    const next = cur.stepIndex + 1;
    if (next >= 3) {
      const reasons = cur.reasons?.length ? cur.reasons : (['publish_executable'] as AssetApprovalReason[]);
      applyApproval(cur.kind, cur.assetId, reasons);
      useMarketplaceStore.getState().showToast(`${cur.assetName} ?????`);
      set({ current: null });
      return;
    }
    set({ current: { ...cur, stepIndex: next } });
  },

  close: () => set({ current: null }),
}));
