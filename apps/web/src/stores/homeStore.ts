import { create } from 'zustand';
import type { HomeCategory, PrototypeAgentSeed } from '@/domain/prototype/types';
import { HOME_BIZ_AGENTS, HOME_REGION_AGENTS } from '@/domain/prototype/home';
import { resolveAgentFromText as resolveAgentFromTextPlan } from '@/domain/plan';
import type { OrgAffiliation, OrgAxis, RegionId } from '@/domain/orgTaxonomy';
import type { PlatformRole } from '@/domain/rbac';
import { hasGlobalOrgScope } from '@/domain/rolePerspective';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface HomeState {
  /** 首页主模式：智能助理 | 场景导航 */
  homeMode: 'assistant' | 'portal';
  /** 筛选轴：机关职能 | 一线区域 */
  axis: OrgAxis;
  /** 当前职能（axis=dept） */
  category: HomeCategory;
  /** 当前区域（axis=region） */
  regionId: RegionId;
  draftText: string;
  setHomeMode: (mode: 'assistant' | 'portal') => void;
  setAxis: (axis: OrgAxis) => void;
  setCategory: (cat: HomeCategory) => void;
  setRegionId: (id: RegionId) => void;
  setDraftText: (text: string) => void;
  fillPrompt: (label: string) => void;
  /** 按登录人归属初始化默认筛选 */
  applyUserOrgDefaults: (aff: OrgAffiliation, role?: PlatformRole) => void;
  getFeaturedAgents: () => PrototypeAgentSeed[];
  resolveAgentFromText: (text: string) => PrototypeAgentSeed | null;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  homeMode: 'assistant',
  axis: 'dept',
  category: 'ecommerce',
  regionId: 'latam',
  draftText: '',

  setHomeMode: (homeMode) => set({ homeMode }),
  setAxis: (axis) => set({ axis }),
  setCategory: (cat) => set({ axis: 'dept', category: cat }),
  setRegionId: (id) => set({ axis: 'region', regionId: id }),
  setDraftText: (text) => set({ draftText: text }),

  fillPrompt: (label) => set({ draftText: buildHomePrompt(label) }),

  applyUserOrgDefaults: (aff, role) => {
    const region = aff.regionId ?? 'latam';
    // 全球管理员视角：默认机关职能 · 电商（不落一线区域）
    if (hasGlobalOrgScope(role)) {
      set({ axis: 'dept', category: 'ecommerce', regionId: region });
      return;
    }
    if (aff.regionId) {
      set({ axis: 'region', regionId: region, category: 'ecommerce' });
    } else {
      set({ axis: 'dept', category: 'ecommerce', regionId: region });
    }
  },

  getFeaturedAgents: () => {
    const { axis, category, regionId } = get();
    const ids = new Set(
      axis === 'region'
        ? (HOME_REGION_AGENTS[regionId] ?? [])
        : (HOME_BIZ_AGENTS[category] ?? []),
    );
    return useMarketplaceStore
      .getState()
      .getPublishedAgents()
      .filter((a) => ids.has(a.id));
  },

  resolveAgentFromText: (text) => resolveAgentFromTextPlan(text),
}));

export function buildHomePrompt(label: string): string {
  if (label.includes('SOP') || label.includes('知识') || label.includes('合规')) {
    return `${label}：/检索 `;
  }
  return `${label}：`;
}

export function getSlashQuery(text: string, mode: '/' | '@'): string {
  const match = mode === '/' ? text.match(/\/([^\s]*)$/) : text.match(/@([^\s]*)$/);
  return match?.[1] ?? '';
}
