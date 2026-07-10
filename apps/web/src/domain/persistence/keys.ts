/** 与 index.html 对齐的 localStorage 键名 */
export const LS_MARKET_VERSION = 'mssclaw_market_ver';
export const LS_KB_VERSION = 'mssclaw_kb_ver';
export const LS_TASK_SESSIONS_VERSION = 'mssclaw_task_sessions_ver';

export const LS_AGENTS = 'mssclaw_agents';
export const LS_SKILLS = 'mssclaw_skills';
export const LS_AUTOMATIONS = 'mssclaw_automations';
export const LS_KB_DOCS = 'mssclaw_kb_docs';
export const LS_TASK_SESSIONS = 'mssclaw_task_sessions';

export function sessionsKeyForWorkspace(workspaceId: string): string {
  return `mssclaw_sessions_${workspaceId}`;
}

/**
 * Marketplace merge strategy (prototype defaults + user/API overrides):
 * 1. Start from built-in prototype seeds (defaults) keyed by id.
 * 2. Overlay saved/remote entries — same id merges fields (remote wins on conflict).
 * 3. New ids from saved/remote are appended; removed prototype ids stay unless explicitly deleted in saved data.
 * Used for agents, skills, and kbDocs in loadMarketplace / readLocalMarketplace.
 */
export function mergeCatalog<T extends { id: string }>(defaults: T[], saved: T[] | null | undefined): T[] {
  if (!Array.isArray(saved) || !saved.length) return structuredClone(defaults);
  const map = new Map(defaults.map((d) => [d.id, { ...d }]));
  saved.forEach((s) => {
    if (!s?.id) return;
    const base = map.get(s.id);
    map.set(s.id, base ? { ...base, ...s } : s);
  });
  return [...map.values()];
}
