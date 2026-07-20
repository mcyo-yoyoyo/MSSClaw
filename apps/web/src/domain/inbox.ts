export type InboxMessageKind = 'system' | 'user' | 'deliverable';

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
  };
}

export function inboxKindLabel(kind: InboxMessageKind): string {
  switch (kind) {
    case 'deliverable':
      return '交付推送';
    case 'user':
      return '成员消息';
    default:
      return '系统通知';
  }
}
