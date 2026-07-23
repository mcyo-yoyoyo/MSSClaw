import { z } from 'zod';
import { getCurrentUserId } from '@/domain/currentUser';

export const MessageRoleSchema = z.enum([
  'user',
  'agent',
  'other',
  'system',
  'typing',
  'plan',
  'step',
]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  text: z.string().optional(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  streaming: z.boolean().optional(),
  planId: z.string().optional(),
  steps: z.array(z.string()).optional(),
  awaitingApproval: z.boolean().optional(),
  mountedSkills: z.array(z.string()).optional(),
  stepId: z.string().optional(),
  index: z.number().optional(),
  total: z.number().optional(),
  label: z.string().optional(),
  stepStatus: z.enum(['pending', 'running', 'done']).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['bot', 'group']),
  icon: z.string(),
  color: z.string(),
  status: z.string(),
  history: z.array(ChatMessageSchema),
  prompts: z.array(z.string()),
  sessionGroup: z.enum(['pinned', 'agents']).optional(),
  iconBg: z.string().optional(),
  badge: z.string().optional(),
  agentId: z.string().optional(),
  actionType: z.enum(['marketing', 'knowledge']).optional(),
  /**
   * 任务来源（静默打标，侧栏暂不分组）
   * skill | expert | case_demo | embedded | other
   */
  taskSource: z.enum(['skill', 'expert', 'case_demo', 'embedded', 'other']).optional(),
  /** 业务场景 S1–S8（来自做任务筛选 / 技能或专家映射） */
  businessScenarioId: z.enum(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']).optional(),
  /** 若由场景技能开工，记录 skill id */
  skillId: z.string().optional(),
  createdAt: z.number().optional(),
  pinnedAt: z.number().optional(),
  /** WarRoom 管理员用户 id */
  adminId: z.string().optional(),
  /** WarRoom 成员（含管理员）；AI 仅对本列表成员开放 */
  members: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().optional(),
        avatar: z.string().optional(),
        role: z.enum(['admin', 'member']),
        canUseAi: z.boolean().default(true),
      }),
    )
    .optional(),
});
export type ChatConfig = z.infer<typeof ChatConfigSchema>;

export type WarRoomMember = NonNullable<ChatConfig['members']>[number];

/** @deprecated 使用 getCurrentUserId() */
export const CURRENT_USER_ID = 'm1';
/** @deprecated 使用 getCurrentUserName() */
export const CURRENT_USER_NAME = 'Mcyo';

export function isWarRoom(chat: Pick<ChatConfig, 'type' | 'sessionGroup'>): boolean {
  return chat.type === 'group' || chat.sessionGroup === 'pinned';
}

export function isWarRoomAdmin(chat: ChatConfig, userId?: string): boolean {
  const uid = userId ?? getCurrentUserId();
  if (!isWarRoom(chat)) return false;
  if (chat.adminId) return chat.adminId === uid;
  return chat.members?.some((m) => m.id === uid && m.role === 'admin') ?? false;
}

export function isWarRoomMember(chat: ChatConfig, userId?: string): boolean {
  const uid = userId ?? getCurrentUserId();
  if (!isWarRoom(chat)) return true;
  if (!chat.members?.length) return true;
  return chat.members.some((m) => m.id === uid);
}

export function canUseWarRoomAi(chat: ChatConfig, userId?: string): boolean {
  const uid = userId ?? getCurrentUserId();
  if (!isWarRoom(chat)) return true;
  if (!chat.members?.length) return true;
  const member = chat.members.find((m) => m.id === uid);
  return Boolean(member?.canUseAi !== false);
}

/** 历史/验收遗留的默认会话 id（加载时剔除，且允许删除） */
export const LEGACY_DEFAULT_CHAT_IDS = new Set([
  'marketing',
  'knowledge',
  'smoke_task',
  'test_task',
]);

/** 可删除的任务/协作空间：用户新建，或历史默认 Agent 会话 */
export function isUserCreatedTask(
  chat: Pick<ChatConfig, 'id'> & Partial<Pick<ChatConfig, 'type' | 'sessionGroup'>>,
): boolean {
  if (chat.id.startsWith('task_') || chat.id.startsWith('warroom_')) return true;
  if (LEGACY_DEFAULT_CHAT_IDS.has(chat.id)) return true;
  // 允许删除侧栏「任务」下的 Agent 会话（含营销/知识等旧默认）
  if (chat.sessionGroup === 'agents' || (!chat.sessionGroup && chat.type === 'bot')) return true;
  return false;
}

export const ModuleIdSchema = z.enum([
  'chat',
  'agent',
  'prompt',
  'skill',
  'tool',
  'workflow',
  'knowledge',
  'memory',
  'settings',
]);
export type ModuleId = z.infer<typeof ModuleIdSchema>;

export const ExecutionStepSchema = z.object({
  skill: z.string(),
  time: z.string(),
  label: z.string(),
  detail: z.string(),
});
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

/** 工作区默认不预置任何 Agent 任务；由用户新建或调用专家时创建 */
export const INITIAL_CHATS: Record<string, ChatConfig> = {};
