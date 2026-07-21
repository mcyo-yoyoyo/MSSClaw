import type { InboxMessage } from '@/domain/inbox';

const VERSION = 'v3-inbox';

function versionKey(workspaceId: string) {
  return `mssclaw_inbox_ver_${workspaceId}`;
}

function dataKey(workspaceId: string) {
  return `mssclaw_inbox_${workspaceId}`;
}

export function loadInboxMessages(workspaceId: string): InboxMessage[] {
  try {
    if (localStorage.getItem(versionKey(workspaceId)) !== VERSION) {
      localStorage.setItem(versionKey(workspaceId), VERSION);
      localStorage.removeItem(dataKey(workspaceId));
      return [];
    }
    const raw = localStorage.getItem(dataKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InboxMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInboxMessages(workspaceId: string, messages: InboxMessage[]) {
  try {
    localStorage.setItem(versionKey(workspaceId), VERSION);
    localStorage.setItem(dataKey(workspaceId), JSON.stringify(messages));
  } catch {
    /* quota */
  }
}
