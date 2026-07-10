import { create } from 'zustand';
import {
  advanceSkillLifecycle as advanceSkillLifecycleApi,
  fetchSkills,
} from '@/api/centerApi';
import {
  findSkillByName,
  getNextSkillLifecycle,
  getSkillsByWorkspace,
  type Skill,
  type SkillLifecycle,
  type SkillTraceStep,
} from '@/domain/skill';

interface SkillState {
  workspaceId: string;
  skills: Skill[];
  selectedSkillId: string | null;
  lifecycleFilter: SkillLifecycle | 'all';
  traceRunning: boolean;
  liveTrace: SkillTraceStep[];
  toast: string | null;

  loadWorkspace: (workspaceId: string) => void;
  selectSkill: (id: string | null) => void;
  selectSkillByName: (name: string) => void;
  setLifecycleFilter: (filter: SkillLifecycle | 'all') => void;
  advanceLifecycle: (skillId: string) => void;
  runTrace: (skillId: string) => Promise<void>;
  dismissToast: () => void;
  selectedSkill: () => Skill | null;
  filteredSkills: () => Skill[];
}

const MOCK_TRACE: SkillTraceStep[] = [
  { timestamp: '00:00.000', phase: 'validate_input', latency: '12ms', status: 'ok', detail: 'Schema 校验通过' },
  { timestamp: '00:00.012', phase: 'resolve_tools', latency: '45ms', status: 'ok', detail: 'Tool 凭证挂载成功' },
  { timestamp: '00:00.057', phase: 'execute', latency: '820ms', status: 'ok', detail: 'Skill 核心逻辑执行完成' },
  { timestamp: '00:00.877', phase: 'validate_output', latency: '18ms', status: 'ok', detail: 'OutputSchema 校验通过' },
];

export const useSkillStore = create<SkillState>((set, get) => ({
  workspaceId: 'ws-3c-latam',
  skills: getSkillsByWorkspace('ws-3c-latam'),
  selectedSkillId: getSkillsByWorkspace('ws-3c-latam')[0]?.id ?? null,
  lifecycleFilter: 'all',
  traceRunning: false,
  liveTrace: [],
  toast: null,

  loadWorkspace: (workspaceId) => {
    void (async () => {
      const skills = await fetchSkills(workspaceId);
      set({
        workspaceId,
        skills,
        selectedSkillId: skills[0]?.id ?? null,
        lifecycleFilter: 'all',
        liveTrace: [],
      });
    })();
  },

  selectSkill: (id) => set({ selectedSkillId: id, liveTrace: [] }),

  selectSkillByName: (name) => {
    const skill = findSkillByName(get().workspaceId, name) ?? get().skills.find((s) => s.name === name || s.displayName === name);
    if (skill) set({ selectedSkillId: skill.id, liveTrace: [] });
  },

  setLifecycleFilter: (filter) => set({ lifecycleFilter: filter }),

  advanceLifecycle: (skillId) => {
    void (async () => {
      const { skills, workspaceId } = get();
      const target = skills.find((s) => s.id === skillId);
      if (!target) return;

      let nextSkills = await advanceSkillLifecycleApi(workspaceId, skillId, skills);
      if (nextSkills === skills) {
        const next = getNextSkillLifecycle(target.lifecycle);
        if (!next) return;
        nextSkills = skills.map((s) =>
          s.id === skillId ? { ...s, lifecycle: next, updatedAt: new Date().toISOString().slice(0, 10) } : s,
        );
      }

      const updated = nextSkills.find((s) => s.id === skillId);
      set({
        skills: nextSkills,
        toast: updated ? `「${target.displayName}」已推进至 ${updated.lifecycle}` : `「${target.displayName}」已更新`,
      });
    })();
  },

  runTrace: async (skillId) => {
    const skill = get().skills.find((s) => s.id === skillId);
    if (!skill || get().traceRunning) return;

    set({ traceRunning: true, liveTrace: [] });

    for (const step of MOCK_TRACE) {
      await new Promise((r) => setTimeout(r, 350));
      set((state) => ({ liveTrace: [...state.liveTrace, step] }));
    }

    set({
      traceRunning: false,
      toast: `「${skill.displayName}」Trace 完成 · 总耗时 ~915ms`,
    });
  },

  dismissToast: () => set({ toast: null }),

  selectedSkill: () => {
    const { skills, selectedSkillId } = get();
    if (!selectedSkillId) return null;
    return skills.find((s) => s.id === selectedSkillId) ?? null;
  },

  filteredSkills: () => {
    const { skills, lifecycleFilter } = get();
    if (lifecycleFilter === 'all') return skills;
    return skills.filter((s) => s.lifecycle === lifecycleFilter);
  },
}));

export function resolveSkillIdFromResource(resourceId: string, resourceName?: string | null, workspaceId?: string) {
  if (resourceId.startsWith('skill-')) return resourceId;
  if (resourceName && workspaceId) return findSkillByName(workspaceId, resourceName)?.id ?? null;
  return null;
}
