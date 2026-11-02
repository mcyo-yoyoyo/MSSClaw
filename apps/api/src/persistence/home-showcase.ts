import { readAssets } from './asset-catalog';
import { readStationAnnouncements } from './operations-store';
import {
  homeFeaturedPayloadForRead,
  type PlatformDocsService,
} from './platform-docs.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';

export interface HomeChannels {
  external: string[];
  internal: string[];
  projects: string[];
}

export interface HomeFeaturedConfig {
  configured: boolean;
  channels: HomeChannels | null;
}

type Asset = Record<string, unknown>;

const SKILL_OMIT = [
  'versions',
  'packageBlob',
  'traceEvaluation',
  'planSteps',
  'cases',
  'caseAttachments',
  'envInfo',
  'securityScan',
];

const AGENT_OMIT = [
  'packageBlob',
  'planSteps',
  'capabilities',
  'targetUsers',
  'capabilityBoundaries',
  'suitableFor',
  'notSuitableFor',
  'inputOutput',
  'quickStart',
  'cases',
  'caseAttachments',
  'environment',
];

/** revision 为 0 表示还没保存过首页配置，三栏继续走旧规则。 */
export function readHomeFeaturedConfig(payload: unknown): HomeFeaturedConfig {
  const parsed = homeFeaturedPayloadForRead(payload);
  if (!parsed.revision || !parsed.channels) return { configured: false, channels: null };
  return { configured: true, channels: parsed.channels };
}

function omitFields(item: Asset, keys: readonly string[]): Asset {
  const next = { ...item };
  for (const key of keys) delete next[key];
  return next;
}

/**
 * 已保存配置时只留三栏引用到的资产。
 * 还没保存时返回全部工具，以及已上架的 Skill / Agent，供旧规则在页面上筛选。
 */
export function selectHomeAssets(input: {
  configured: boolean;
  channels: HomeChannels | null;
  tools: Asset[];
  skills: Asset[];
  agents: Asset[];
}): { tools: Asset[]; skills: Asset[]; agents: Asset[] } {
  if (!input.configured || !input.channels) {
    return {
      tools: input.tools.map((item) => ({ ...item })),
      skills: input.skills.filter((item) => item.published === true).map((item) => omitFields(item, SKILL_OMIT)),
      agents: input.agents.filter((item) => item.published === true).map((item) => omitFields(item, AGENT_OMIT)),
    };
  }
  const toolIds = new Set([...input.channels.external, ...input.channels.internal]);
  const skillIds = new Set<string>();
  const agentIds = new Set<string>();
  for (const ref of input.channels.projects) {
    const splitAt = ref.indexOf(':');
    if (splitAt <= 0) continue;
    const kind = ref.slice(0, splitAt);
    const id = ref.slice(splitAt + 1);
    if (kind === 'skill') skillIds.add(id);
    if (kind === 'agent') agentIds.add(id);
  }
  return {
    tools: input.tools.filter((item) => toolIds.has(String(item.id))).map((item) => ({ ...item })),
    skills: input.skills
      .filter((item) => skillIds.has(String(item.id)))
      .map((item) => omitFields(item, SKILL_OMIT)),
    agents: input.agents
      .filter((item) => agentIds.has(String(item.id)))
      .map((item) => omitFields(item, AGENT_OMIT)),
  };
}

export async function readHomeShowcase(prisma: PrismaService, docs: PlatformDocsService) {
  const featuredRow = await prisma.appSetting.findUnique({ where: { settingKey: 'home-featured' } });
  const featured = readHomeFeaturedConfig(featuredRow?.value);
  const [tools, skills, agents, announcements] = await Promise.all([
    readAssets(prisma, 'tool'),
    readAssets(prisma, 'skill'),
    readAssets(prisma, 'agent'),
    readStationAnnouncements(prisma),
  ]);
  const selected = selectHomeAssets({ ...featured, tools, skills, agents });
  const legacy = featured.configured
    ? { externalToolLayout: null, officeScenes: null }
    : await readLegacyHomeDocs(docs);
  return {
    configured: featured.configured,
    channels: featured.channels,
    ...selected,
    announcements: announcements.items,
    announcementRevision: announcements.revision,
    ...legacy,
  };
}

async function readLegacyHomeDocs(docs: PlatformDocsService) {
  const [layout, scenes] = await Promise.all([
    docs.getDoc(PLATFORM_WORKSPACE_ID, 'external-tool-layout'),
    docs.getDoc(PLATFORM_WORKSPACE_ID, 'internal-office-scenes'),
  ]);
  return {
    externalToolLayout: layout.payload,
    officeScenes: scenes.payload,
  };
}
