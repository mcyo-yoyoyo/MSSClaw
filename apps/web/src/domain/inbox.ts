export type InboxMessageKind = 'system' | 'user' | 'deliverable' | 'ai_news' | 'announce';

export interface InboxMessage {
  id: string;
  kind: InboxMessageKind;
  title: string;
  body: string;
  fromUserId?: string;
  fromName: string;
  /** 收件人用户 id；系统广播可用 '*' */
  toUserId: string;
  createdAt: string;
  read: boolean;
  meta?: {
    chatId?: string;
    warroomId?: string;
    warroomTitle?: string;
    artifactType?: string;
    query?: string;
    /** AI 新闻发布日 YYYY-MM-DD */
    newsDate?: string;
    /** 站内公告标签，与首页公告条同色 */
    announcementTag?: string;
    cadence?: 'daily' | 'weekly';
  };
}

const APPROVAL_SUCCESS_TITLES = new Set([
  '上架审批已通过',
  '更新上架审批已通过',
  '下架审批已通过',
]);

/**
 * 审批通过结果已在审批记录和即时提示中反馈，不再占用消息中心。
 * 保留此识别逻辑用于隐藏升级前已持久化的历史通知。
 */
export function isApprovalSuccessNotification(
  message: Pick<InboxMessage, 'kind' | 'title' | 'fromName'>,
): boolean {
  return (
    message.kind === 'system' &&
    message.fromName === 'MSS 质量与运营' &&
    APPROVAL_SUCCESS_TITLES.has(message.title.trim())
  );
}

/**
 * 「我的消息」目前只展示站内公告；系统提醒、交付推送等先不露出。
 * 页面列表和顶栏未读角标共用这条规则，放宽时改这里一处即可。
 */
export function isVisibleInboxMessage(message: Pick<InboxMessage, 'kind'>): boolean {
  return message.kind === 'announce';
}

export function inboxKindLabel(kind: InboxMessageKind): string {
  switch (kind) {
    case 'deliverable':
      return '交付推送';
    case 'user':
      return '成员消息';
    case 'ai_news':
      return 'AI新闻';
    case 'announce':
      return '站内公告';
    default:
      return '系统通知';
  }
}
