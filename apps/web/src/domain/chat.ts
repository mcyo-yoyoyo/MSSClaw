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

/** 用户通过「新建任务」创建的会话（可删除） */
export function isUserCreatedTask(chat: Pick<ChatConfig, 'id'>): boolean {
  return chat.id.startsWith('task_') || chat.id.startsWith('warroom_');
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

export const INITIAL_CHATS: Record<string, ChatConfig> = {
  marketing: {
    id: 'marketing',
    title: '营销 Agent',
    type: 'bot',
    icon: 'fa-chart-pie',
    color: 'claw',
    iconBg: 'bg-gradient-to-br from-[#18181b] to-[#18181b]',
    badge: '营销',
    sessionGroup: 'agents',
    actionType: 'marketing',
    status: '已接入 PSI、GFK & ISRP等多系统数据',
    createdAt: 1,
    history: [
      {
        role: 'agent',
        name: '营销 Agent',
        text: '您好！我是华为营销服数据分析 Agent。基于 ISRP/零售/电商多源数据，我可以为您执行深度的异动归因与预测推演。',
      },
    ],
    prompts: [
      '近一周欧洲穿戴产品销售趋势分析，/数据分析',
      '各代表处25年累计SO总量排名，剔除IoT，/so报表',
      '3月各代表处DOS分析，/零售洞察',
    ],
  },
  knowledge: {
    id: 'knowledge',
    title: '知识 Agent',
    type: 'bot',
    icon: 'fa-book-open',
    color: 'claw',
    iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    badge: '知识',
    sessionGroup: 'agents',
    actionType: 'knowledge',
    status: '已挂载企业知识库 · RAG 溯源',
    createdAt: 2,
    history: [
      {
        role: 'agent',
        name: '知识 Agent',
        text: '您好！我是企业 RAG 知识助手。已加载产品白皮书、合规标准及各部门 SOP。支持带引用的文献溯源问答。',
      },
    ],
    prompts: [
      '检索可穿戴医疗用语合规检查清单，/检索',
      '查询拉美/EU 市场准入 Checklist，/检索',
      '客诉 SOP 电池过热标准话术，/客诉',
    ],
  },
};
