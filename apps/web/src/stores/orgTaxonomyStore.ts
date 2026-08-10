import { create } from 'zustand';
import {
  CHINA_REGION_ID,
  DEFAULT_HQ_DEPTS,
  DEFAULT_REGIONS,
  HQ_REGION_ID,
  setOrgTaxonomy,
  sortDeptIdsByLabel,
  sortRegionIdsByLabel,
  type DeptId,
  type OrgUnit,
  type RegionId,
} from '@/domain/orgTaxonomy';
import {
  canUsePlatformDocsApi,
  currentWorkspaceId,
  fetchPlatformDoc,
  scheduleSavePlatformDoc,
} from '@/api/platformDocsApi';

function slugFromLabel(label: string, prefix: 'd' | 'r'): string {
  const ascii = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (ascii && /^[a-z]/.test(ascii)) return ascii.slice(0, 32);
  return `${prefix}_${Date.now().toString(36)}`;
}

/** 兼容旧字典：中国→中国区；补齐机关；按展示序重排 */
function migrateRegions(regions: OrgUnit[]): OrgUnit[] {
  const byId = new Map<string, OrgUnit>();
  for (const r of regions) {
    if (!r?.id || !r?.label) continue;
    if (r.id === CHINA_REGION_ID) {
      byId.set(r.id, { ...r, label: '中国区' });
    } else {
      byId.set(r.id, r);
    }
  }
  if (!byId.has(HQ_REGION_ID)) {
    byId.set(HQ_REGION_ID, { id: HQ_REGION_ID, label: '机关' });
  }
  const orderedIds = sortRegionIdsByLabel([...byId.keys()] as RegionId[]);
  return orderedIds.map((id) => byId.get(id)!);
}

function migrateDepts(depts: OrgUnit[]): OrgUnit[] {
  const valid = depts
    .filter((d) => d?.id && d?.label)
    .map((d) =>
      d.id === 'quality' && (d.label === '质量与运营' || d.label === '质量运营')
        ? { ...d, label: '质运' }
        : d,
    );
  const ordered = sortDeptIdsByLabel(valid.map((d) => d.id as DeptId));
  const byId = new Map(valid.map((d) => [d.id, d]));
  return ordered.map((id) => byId.get(id)!);
}

function defaults(): { depts: OrgUnit[]; regions: OrgUnit[] } {
  return { depts: [...DEFAULT_HQ_DEPTS], regions: [...DEFAULT_REGIONS] };
}

function normalizeRemote(remote: {
  depts?: OrgUnit[];
  regions?: OrgUnit[];
} | null): { depts: OrgUnit[]; regions: OrgUnit[] } {
  if (!remote) return defaults();
  const depts =
    Array.isArray(remote.depts) && remote.depts.length
      ? migrateDepts(remote.depts)
      : [...DEFAULT_HQ_DEPTS];
  const regions =
    Array.isArray(remote.regions) && remote.regions.length
      ? migrateRegions(remote.regions)
      : [...DEFAULT_REGIONS];
  return { depts, regions };
}

function persist(depts: OrgUnit[], regions: OrgUnit[]) {
  setOrgTaxonomy(depts, regions);
  if (!canUsePlatformDocsApi()) return;
  void scheduleSavePlatformDoc(currentWorkspaceId(), 'org-taxonomy', { depts, regions });
}

interface OrgTaxonomyState {
  depts: OrgUnit[];
  regions: OrgUnit[];
  toast: string | null;
  hydrate: () => void;
  addDept: (label: string, id?: string) => boolean;
  updateDept: (id: DeptId, label: string) => boolean;
  removeDept: (id: DeptId, memberCount?: number) => boolean;
  addRegion: (label: string, id?: string) => boolean;
  updateRegion: (id: RegionId, label: string) => boolean;
  removeRegion: (id: RegionId, memberCount?: number) => boolean;
  resetDefaults: () => void;
  dismissToast: () => void;
}

const initial = defaults();
setOrgTaxonomy(initial.depts, initial.regions);

export const useOrgTaxonomyStore = create<OrgTaxonomyState>((set, get) => ({
  depts: initial.depts,
  regions: initial.regions,
  toast: null,

  hydrate: () => {
    void (async () => {
      if (!canUsePlatformDocsApi()) {
        const next = defaults();
        setOrgTaxonomy(next.depts, next.regions);
        set(next);
        return;
      }
      try {
        const remote = await fetchPlatformDoc<{ depts?: OrgUnit[]; regions?: OrgUnit[] }>(
          currentWorkspaceId(),
          'org-taxonomy',
        );
        const next = normalizeRemote(remote);
        setOrgTaxonomy(next.depts, next.regions);
        set(next);
      } catch {
        const next = defaults();
        setOrgTaxonomy(next.depts, next.regions);
        set(next);
      }
    })();
  },

  addDept: (label, id) => {
    const trimmed = label.trim();
    if (!trimmed) {
      set({ toast: '请输入部门名称' });
      return false;
    }
    const nextId = (id?.trim() || slugFromLabel(trimmed, 'd')) as DeptId;
    if (get().depts.some((d) => d.id === nextId)) {
      set({ toast: '部门编码已存在' });
      return false;
    }
    const depts = [...get().depts, { id: nextId, label: trimmed }];
    persist(depts, get().regions);
    set({ depts, toast: `已新增部门「${trimmed}」` });
    return true;
  },

  updateDept: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) {
      set({ toast: '部门名称不能为空' });
      return false;
    }
    const depts = get().depts.map((d) => (d.id === id ? { ...d, label: trimmed } : d));
    persist(depts, get().regions);
    set({ depts, toast: '部门已更新' });
    return true;
  },

  removeDept: (id, memberCount = 0) => {
    if (memberCount > 0) {
      set({ toast: `仍有 ${memberCount} 名成员归属该部门，请先调整成员后再删除` });
      return false;
    }
    if (get().depts.length <= 1) {
      set({ toast: '至少保留一个部门' });
      return false;
    }
    const depts = get().depts.filter((d) => d.id !== id);
    persist(depts, get().regions);
    set({ depts, toast: '部门已删除' });
    return true;
  },

  addRegion: (label, id) => {
    const trimmed = label.trim();
    if (!trimmed) {
      set({ toast: '请输入区域名称' });
      return false;
    }
    const nextId = (id?.trim() || slugFromLabel(trimmed, 'r')) as RegionId;
    if (get().regions.some((r) => r.id === nextId)) {
      set({ toast: '区域编码已存在' });
      return false;
    }
    const regions = [...get().regions, { id: nextId, label: trimmed }];
    persist(get().depts, regions);
    set({ regions, toast: `已新增区域「${trimmed}」` });
    return true;
  },

  updateRegion: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) {
      set({ toast: '区域名称不能为空' });
      return false;
    }
    const regions = get().regions.map((r) => (r.id === id ? { ...r, label: trimmed } : r));
    persist(get().depts, regions);
    set({ regions, toast: '区域已更新' });
    return true;
  },

  removeRegion: (id, memberCount = 0) => {
    if (memberCount > 0) {
      set({ toast: `仍有 ${memberCount} 名成员归属该区域，请先调整成员后再删除` });
      return false;
    }
    if (get().regions.length <= 1) {
      set({ toast: '至少保留一个区域' });
      return false;
    }
    const regions = get().regions.filter((r) => r.id !== id);
    persist(get().depts, regions);
    set({ regions, toast: '区域已删除' });
    return true;
  },

  resetDefaults: () => {
    const depts = [...DEFAULT_HQ_DEPTS];
    const regions = [...DEFAULT_REGIONS];
    persist(depts, regions);
    set({ depts, regions, toast: '已恢复默认部门与区域' });
  },

  dismissToast: () => set({ toast: null }),
}));
