import type { ChatConfig } from '@/domain/chat';
import { isOwnedPersonalAiTask, isWarRoom } from '@/domain/chat';
import { getAgentById } from '@/domain/plan';
import { getTaskUiStatus, taskUiStatusPriority } from '@/domain/taskUiStatus';
import { getCurrentUserId } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';

export const AI_TASKS_UNCATEGORIZED_KEY = 'uncategorized';

export interface AiTaskAgentGroup {
  key: string;
  agentId?: string;
  skillId?: string;
  label: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  sessions: ChatConfig[];
  latestAt: number;
}

function sessionRecency(chat: ChatConfig): number {
  return chat.pinnedAt ?? chat.createdAt ?? 0;
}

function previewText(chat: ChatConfig): string {
  const hist = chat.history ?? [];
  for (let i = hist.length - 1; i >= 0; i -= 1) {
    const m = hist[i];
    if (!m || m.role === 'typing' || m.role === 'step') continue;
    const text = (m.text || m.label || '').trim();
    if (text) return text.slice(0, 120);
  }
  return '尚无对话内容';
}

export function aiTaskSessionPreview(chat: ChatConfig): string {
  return previewText(chat);
}

/** 仅当前登录用户自己的 AI 任务历史（他人不可见） */
export function listAiTaskSessions(chats: Record<string, ChatConfig> | ChatConfig[]): ChatConfig[] {
  const list = Array.isArray(chats) ? chats : Object.values(chats);
  const uid = getCurrentUserId();
  return list
    .filter((c) => !isWarRoom(c) && isOwnedPersonalAiTask(c, uid))
    .sort((a, b) => {
      const pa = taskUiStatusPriority(getTaskUiStatus(a).id);
      const pb = taskUiStatusPriority(getTaskUiStatus(b).id);
      if (pa !== pb) return pa - pb;
      return sessionRecency(b) - sessionRecency(a);
    });
}

function resolveSkillLabel(skillId?: string): string | null {
  if (!skillId) return null;
  const skill = useMarketplaceStore.getState().skills.find((s) => s.id === skillId);
  return skill?.nameZh || skill?.name || skillId;
}

/** 按 Agent（其次 Skill）归类历史执行会话，供 AI 任务页侧栏 */
export function groupAiTasksByAgent(
  chats: Record<string, ChatConfig> | ChatConfig[],
): AiTaskAgentGroup[] {
  const sessions = listAiTaskSessions(chats);
  const map = new Map<string, AiTaskAgentGroup>();

  for (const chat of sessions) {
    const agent = getAgentById(chat.agentId);
    let key: string;
    let label: string;
    let subtitle: string;
    let icon: string;
    let iconBg: string;
    let agentId: string | undefined;
    let skillId: string | undefined;

    if (agent) {
      key = agent.id;
      agentId = agent.id;
      label = agent.name;
      subtitle = 'Agent 调用';
      icon = agent.icon || 'fa-robot';
      iconBg = agent.color || chat.iconBg || 'bg-zinc-800';
    } else if (chat.skillId) {
      key = `skill:${chat.skillId}`;
      skillId = chat.skillId;
      label = resolveSkillLabel(chat.skillId) || chat.skillId;
      subtitle = 'Skill 执行';
      icon = chat.icon || 'fa-cube';
      iconBg = chat.iconBg || 'bg-violet-700';
    } else {
      key = AI_TASKS_UNCATEGORIZED_KEY;
      label = '通用对话';
      subtitle = '未绑定 Agent / Skill';
      icon = 'fa-comments';
      iconBg = 'bg-zinc-600';
    }

    const existing = map.get(key);
    if (existing) {
      existing.sessions.push(chat);
      existing.latestAt = Math.max(existing.latestAt, sessionRecency(chat));
    } else {
      map.set(key, {
        key,
        agentId,
        skillId,
        label,
        subtitle,
        icon,
        iconBg,
        sessions: [chat],
        latestAt: sessionRecency(chat),
      });
    }
  }

  return [...map.values()].sort((a, b) => b.latestAt - a.latestAt);
}

export function formatAiTaskTime(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

/** 当前用户展示名（页头提示用） */
export function currentAiTaskOwnerLabel(): string {
  const user = useSessionStore.getState().user;
  return user?.name || user?.email || '当前用户';
}
