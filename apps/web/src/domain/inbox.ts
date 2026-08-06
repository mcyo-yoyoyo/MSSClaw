export type InboxMessageKind = 'system' | 'user' | 'deliverable' | 'ai_news';

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
    cadence?: 'daily' | 'weekly';
  };
}

export function inboxKindLabel(kind: InboxMessageKind): string {
  switch (kind) {
    case 'deliverable':
      return '交付推送';
    case 'user':
      return '成员消息';
    case 'ai_news':
      return 'AI新闻';
    default:
      return '系统通知';
  }
}
