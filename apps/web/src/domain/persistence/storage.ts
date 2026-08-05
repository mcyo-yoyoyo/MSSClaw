import type { ChatConfig } from '@/domain/chat';
import {
  KB_VERSION,
  MARKET_VERSION,
  TASK_SESSIONS_VERSION,
} from '@/domain/prototype/constants';
import { PROTOTYPE_AGENTS } from '@/domain/prototype/agents';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';
import { PROTOTYPE_TOOLS, pruneRetiredDemoTools } from '@/domain/prototype/tools';
import { PROTOTYPE_AUTOMATIONS } from '@/domain/prototype/automations';
import { PROTOTYPE_KB_DOCS } from '@/domain/prototype/kb';
import { applyCanonicalSkillOwnershipList } from '@/domain/prototype/skillOwnership';
import type {
  PrototypeAgentSeed,
  PrototypeAutomation,
  PrototypeKbDocument,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import {
  LS_AGENTS,
  LS_AUTOMATIONS,
  LS_KB_DOCS,
  LS_KB_VERSION,
  LS_MARKET_VERSION,
  LS_SKILLS,
  LS_TOOLS,
  LS_TASK_SESSIONS,
  LS_TASK_SESSIONS_VERSION,
  mergeCatalog,
  sessionsKeyForWorkspace,
} from '@/domain/persistence/keys';
import {
  fetchMarketplaceApi,
  fetchSessionsApi,
  saveMarketplaceApi,
  saveSessionsApi,
} from '@/api/persistenceApi';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { demoDefaults } from '@/domain/demoContentPolicy';

export interface MarketplaceSnapshot {
  agents: PrototypeAgentSeed[];
  skills: PrototypeSkillSeed[];
  tools: PrototypeToolSeed[];
  automations: PrototypeAutomation[];
  kbDocs: PrototypeKbDocument[];
}

/** 公司内部工具：种子里的真实跳转链接 / Logo 优先于本地缓存旧值 */
function refreshHwInternalToolMeta(tools: PrototypeToolSeed[]): PrototypeToolSeed[] {
  const seedById = new Map(demoDefaults(PROTOTYPE_TOOLS).map((t) => [t.id, t]));
  return tools.map((t) => {
    const seed = seedById.get(t.id);
    if (!seed?.tags?.includes('hw-internal')) return t;
    return {
      ...t,
      homepageUrl: seed.homepageUrl || t.homepageUrl,
      logoUrl: seed.logoUrl || t.logoUrl,
    };
  });
}

function readLocalMarketplace(): MarketplaceSnapshot {
  if (localStorage.getItem(LS_MARKET_VERSION) !== MARKET_VERSION) {
    localStorage.removeItem(LS_AGENTS);
    localStorage.removeItem(LS_SKILLS);
    localStorage.removeItem(LS_TOOLS);
    localStorage.setItem(LS_MARKET_VERSION, MARKET_VERSION);
  }
  if (localStorage.getItem(LS_KB_VERSION) !== KB_VERSION) {
    localStorage.removeItem(LS_KB_DOCS);
    localStorage.setItem(LS_KB_VERSION, KB_VERSION);
  }

  try {
    const savedA = JSON.parse(localStorage.getItem(LS_AGENTS) || 'null') as PrototypeAgentSeed[] | null;
    const savedS = JSON.parse(localStorage.getItem(LS_SKILLS) || 'null') as PrototypeSkillSeed[] | null;
    const savedT = JSON.parse(localStorage.getItem(LS_TOOLS) || 'null') as PrototypeToolSeed[] | null;
    const savedAuto = JSON.parse(localStorage.getItem(LS_AUTOMATIONS) || 'null') as PrototypeAutomation[] | null;
    const savedKb = JSON.parse(localStorage.getItem(LS_KB_DOCS) || 'null') as PrototypeKbDocument[] | null;

    const agents0 = demoDefaults(PROTOTYPE_AGENTS);
    const skills0 = demoDefaults(PROTOTYPE_SKILLS);
    const tools0 = demoDefaults(PROTOTYPE_TOOLS);
    const autos0 = demoDefaults(PROTOTYPE_AUTOMATIONS);
    const kb0 = demoDefaults(PROTOTYPE_KB_DOCS);
    return {
      agents: mergeCatalog(agents0, savedA),
      skills: applyCanonicalSkillOwnershipList(mergeCatalog(skills0, savedS)),
      tools: pruneRetiredDemoTools(
        refreshHwInternalToolMeta(mergeCatalog(tools0, savedT)),
      ),
      automations:
        Array.isArray(savedAuto) && savedAuto.length
          ? savedAuto
          : structuredClone(autos0),
      kbDocs: mergeCatalog(kb0, savedKb),
    };
  } catch {
    return {
      agents: structuredClone(demoDefaults(PROTOTYPE_AGENTS)),
      skills: applyCanonicalSkillOwnershipList(
        structuredClone(demoDefaults(PROTOTYPE_SKILLS)),
      ),
      tools: pruneRetiredDemoTools(structuredClone(demoDefaults(PROTOTYPE_TOOLS))),
      automations: structuredClone(demoDefaults(PROTOTYPE_AUTOMATIONS)),
      kbDocs: structuredClone(demoDefaults(PROTOTYPE_KB_DOCS)),
    };
  }
}

function writeLocalMarketplace(snapshot: MarketplaceSnapshot) {
  localStorage.setItem(LS_AGENTS, JSON.stringify(snapshot.agents));
  localStorage.setItem(LS_SKILLS, JSON.stringify(snapshot.skills));
  localStorage.setItem(LS_TOOLS, JSON.stringify(snapshot.tools));
  localStorage.setItem(LS_AUTOMATIONS, JSON.stringify(snapshot.automations));
  localStorage.setItem(LS_KB_DOCS, JSON.stringify(snapshot.kbDocs));
}

export async function loadMarketplace(workspaceId: string): Promise<MarketplaceSnapshot> {
  const apiOnline = useWorkspaceStore.getState().apiConnected;
  if (apiOnline) {
    try {
      const remote = await fetchMarketplaceApi(workspaceId);
      if (remote) {
        return {
          agents: mergeCatalog(
            demoDefaults(PROTOTYPE_AGENTS),
            remote.agents as PrototypeAgentSeed[],
          ),
          skills: applyCanonicalSkillOwnershipList(
            mergeCatalog(
              demoDefaults(PROTOTYPE_SKILLS),
              remote.skills as PrototypeSkillSeed[],
            ),
          ),
          tools: pruneRetiredDemoTools(
            refreshHwInternalToolMeta(
              mergeCatalog(
                demoDefaults(PROTOTYPE_TOOLS),
                (remote as { tools?: PrototypeToolSeed[] }).tools,
              ),
            ),
          ),
          automations:
            Array.isArray(remote.automations) && remote.automations.length
              ? (remote.automations as PrototypeAutomation[])
              : structuredClone(demoDefaults(PROTOTYPE_AUTOMATIONS)),
          kbDocs: mergeCatalog(
            demoDefaults(PROTOTYPE_KB_DOCS),
            remote.kbDocs as PrototypeKbDocument[],
          ),
        };
      }
    } catch {
      /* fall through to local */
    }
  }
  return readLocalMarketplace();
}

export async function saveMarketplace(workspaceId: string, snapshot: MarketplaceSnapshot): Promise<void> {
  writeLocalMarketplace(snapshot);
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      await saveMarketplaceApi(workspaceId, snapshot);
    } catch {
      /* local already saved */
    }
  }
}

function readLocalSessions(workspaceId: string): Record<string, ChatConfig> | null {
  const scopedKey = sessionsKeyForWorkspace(workspaceId);
  const scoped = localStorage.getItem(scopedKey);
  if (scoped) {
    try {
      const parsed = JSON.parse(scoped) as Record<string, ChatConfig>;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* ignore */
    }
  }

  if (localStorage.getItem(LS_TASK_SESSIONS_VERSION) !== TASK_SESSIONS_VERSION) {
    localStorage.removeItem(LS_TASK_SESSIONS);
    localStorage.setItem(LS_TASK_SESSIONS_VERSION, TASK_SESSIONS_VERSION);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(LS_TASK_SESSIONS) || 'null') as {
      configs?: Record<string, ChatConfig>;
    } | null;
    if (saved?.configs && Object.keys(saved.configs).length) return saved.configs;
  } catch {
    /* ignore */
  }
  return null;
}

function writeLocalSessions(workspaceId: string, chats: Record<string, ChatConfig>) {
  localStorage.setItem(sessionsKeyForWorkspace(workspaceId), JSON.stringify(chats));
  localStorage.setItem(LS_TASK_SESSIONS, JSON.stringify({ configs: chats, index: Object.keys(chats) }));
}

export async function loadSessions(
  workspaceId: string,
): Promise<Record<string, ChatConfig> | null> {
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      const remote = await fetchSessionsApi(workspaceId);
      if (remote && Object.keys(remote).length) return remote;
    } catch {
      /* fall through */
    }
  }
  return readLocalSessions(workspaceId);
}

export async function saveSessions(
  workspaceId: string,
  chats: Record<string, ChatConfig>,
): Promise<void> {
  writeLocalSessions(workspaceId, chats);
  if (useWorkspaceStore.getState().apiConnected) {
    try {
      await saveSessionsApi(workspaceId, chats);
    } catch {
      /* local already saved */
    }
  }
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleSaveMarketplace(workspaceId: string, snapshot: MarketplaceSnapshot, ms = 600) {
  const key = `market:${workspaceId}`;
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void saveMarketplace(workspaceId, snapshot);
    }, ms),
  );
}

export function scheduleSaveSessions(workspaceId: string, chats: Record<string, ChatConfig>, ms = 600) {
  const key = `sessions:${workspaceId}`;
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      void saveSessions(workspaceId, chats);
    }, ms),
  );
}
