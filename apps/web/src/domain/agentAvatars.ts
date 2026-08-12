/**
 * Agent 数字员工形象：系统预设头像（20 套）
 * —— 真人卡通 / 数字员工形象；企业文化命名仅作标签，与附件人设文案无关。
 */

export interface AgentAvatarPreset {
  id: string;
  /** 展示名（企业文化意象标签） */
  label: string;
  /** 一句话释义 */
  hint: string;
  /** 静态资源路径（public/agent-avatars） */
  src: string;
}

function avatarSrc(id: string): string {
  return `/agent-avatars/${id}.png`;
}

/** 企业文化取向命名；图片按附件网格 01→20 顺序映射，不取附件人设/职位文案 */
export const AGENT_AVATAR_PRESETS: AgentAvatarPreset[] = [
  { id: 'hw-chengxin', label: '诚正', hint: '以诚立身', src: avatarSrc('hw-chengxin') },
  { id: 'hw-houde', label: '厚德', hint: '厚德载物', src: avatarSrc('hw-houde') },
  { id: 'hw-mingyuan', label: '明远', hint: '洞见明远', src: avatarSrc('hw-mingyuan') },
  { id: 'hw-ruisi', label: '睿思', hint: '审慎睿思', src: avatarSrc('hw-ruisi') },
  { id: 'hw-duxing', label: '笃行', hint: '知行合一', src: avatarSrc('hw-duxing') },
  { id: 'hw-jingye', label: '敬业', hint: '敬业乐群', src: avatarSrc('hw-jingye') },
  { id: 'hw-zhuoyue', label: '卓越', hint: '追求卓越', src: avatarSrc('hw-zhuoyue') },
  { id: 'hw-tuozhan', label: '拓疆', hint: '开拓进取', src: avatarSrc('hw-tuozhan') },
  { id: 'hw-shouzheng', label: '守正', hint: '守正创新', src: avatarSrc('hw-shouzheng') },
  { id: 'hw-xieli', label: '协力', hint: '协同共进', src: avatarSrc('hw-xieli') },
  { id: 'hw-wenjian', label: '稳健', hint: '行稳致远', src: avatarSrc('hw-wenjian') },
  { id: 'hw-kaiwu', label: '开物', hint: '开物成务', src: avatarSrc('hw-kaiwu') },
  { id: 'hw-zhicheng', label: '至诚', hint: '至诚无息', src: avatarSrc('hw-zhicheng') },
  { id: 'hw-qianxue', label: '潜学', hint: '潜心治学', src: avatarSrc('hw-qianxue') },
  { id: 'hw-lixing', label: '力行', hint: '躬行实践', src: avatarSrc('hw-lixing') },
  { id: 'hw-hengyi', label: '恒毅', hint: '持之以恒', src: avatarSrc('hw-hengyi') },
  { id: 'hw-guanghua', label: '光华', hint: '光华笃实', src: avatarSrc('hw-guanghua') },
  { id: 'hw-qinglan', label: '青蓝', hint: '青出于蓝', src: avatarSrc('hw-qinglan') },
  { id: 'hw-songbo', label: '松柏', hint: '岁寒松柏', src: avatarSrc('hw-songbo') },
  { id: 'hw-xingzhi', label: '行知', hint: '行是知之始', src: avatarSrc('hw-xingzhi') },
];

const BY_ID = new Map(AGENT_AVATAR_PRESETS.map((p) => [p.id, p]));

export const DEFAULT_AGENT_AVATAR_PRESET_ID = AGENT_AVATAR_PRESETS[0]!.id;

export function getAgentAvatarPreset(id?: string | null): AgentAvatarPreset | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/** 未配置头像时，按 agentId 稳定映射到一套预设，保证数字员工始终有形象 */
export function pickFallbackAvatarPresetId(agentId?: string | null): string {
  if (!agentId) return DEFAULT_AGENT_AVATAR_PRESET_ID;
  let hash = 0;
  for (let i = 0; i < agentId.length; i += 1) {
    hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0;
  }
  return AGENT_AVATAR_PRESETS[hash % AGENT_AVATAR_PRESETS.length]!.id;
}

/** 解析 Agent 展示头像：自定义上传 > 显式预设 > 按 id 回退预设 */
export function resolveAgentAvatarSrc(agent: {
  id?: string | null;
  avatarUrl?: string | null;
  avatarPresetId?: string | null;
}): string | null {
  const uploaded = agent.avatarUrl?.trim();
  if (uploaded) return uploaded;
  const explicit = getAgentAvatarPreset(agent.avatarPresetId);
  if (explicit) return explicit.src;
  const fallback = getAgentAvatarPreset(pickFallbackAvatarPresetId(agent.id));
  return fallback?.src ?? null;
}
