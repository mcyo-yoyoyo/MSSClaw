import { create } from 'zustand';
import type { AssetApprovalKind, AssetApprovalRequest } from '@/domain/assetApproval';
import { getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface AssetApprovalState {
  current: AssetApprovalRequest | null;
  openApproval: (input: Omit<AssetApprovalRequest, 'stepIndex' | 'createdAt' | 'submitterName'> & {
    submitterName?: string;
  }) => void;
  advance: () => void;
  close: () => void;
}

function markPublished(kind: AssetApprovalKind, assetId: string) {
  const market = useMarketplaceStore.getState();
  if (kind === 'agent') {
    const agent = market.agents.find((a) => a.id === assetId);
    if (agent) market.upsertAgent({ ...agent, published: true });
  } else if (kind === 'skill') {
    const skill = market.skills.find((s) => s.id === assetId);
    if (skill) market.upsertSkill({ ...skill, published: true });
  } else if (kind === 'tool') {
    const tool = market.tools.find((t) => t.id === assetId);
    if (tool) market.upsertTool({ ...tool, published: true });
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
        submitterName: input.submitterName || getCurrentUserName() || '当前用户',
        stepIndex: 1, // 提交人已完成，进入业务主管
        createdAt: Date.now(),
      },
    });
  },

  advance: () => {
    const cur = get().current;
    if (!cur) return;
    const next = cur.stepIndex + 1;
    if (next >= 3) {
      markPublished(cur.kind, cur.assetId);
      useMarketplaceStore.getState().showToast(`${cur.assetName} 已通过审批并上架`);
      set({ current: null });
      return;
    }
    set({ current: { ...cur, stepIndex: next } });
  },

  close: () => set({ current: null }),
}));
