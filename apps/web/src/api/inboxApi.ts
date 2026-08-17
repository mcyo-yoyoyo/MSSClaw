import type { InboxMessage } from '@/domain/inbox';
import { apiAuthHeaders, apiUrl } from '@/api/client';
import { canUsePlatformDocsApi } from '@/api/platformDocsApi';

const headers = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...apiAuthHeaders(),
});

export function canUseInboxApi() {
  return canUsePlatformDocsApi();
}

export async function fetchInboxMessages(workspaceId: string, userId: string) {
  const response = await fetch(
    apiUrl(`/api/v1/workspaces/${workspaceId}/inbox/messages?userId=${encodeURIComponent(userId)}`),
    { headers: headers(), cache: 'no-store' },
  );
  if (!response.ok) throw new Error(`inbox_get_${response.status}`);
  const body = (await response.json()) as { messages?: InboxMessage[] };
  return Array.isArray(body.messages) ? body.messages : [];
}

export async function createInboxMessage(workspaceId: string, message: InboxMessage) {
  const response = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/inbox/messages`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(message),
  });
  if (!response.ok) throw new Error(`inbox_create_${response.status}`);
}

export async function markInboxRead(workspaceId: string, userId: string, messageId: string) {
  const response = await fetch(
    apiUrl(`/api/v1/workspaces/${workspaceId}/inbox/messages/${encodeURIComponent(messageId)}/read`),
    { method: 'POST', headers: headers(), body: JSON.stringify({ userId }) },
  );
  if (!response.ok) throw new Error(`inbox_read_${response.status}`);
}

export async function markInboxAllRead(workspaceId: string, userId: string) {
  const response = await fetch(apiUrl(`/api/v1/workspaces/${workspaceId}/inbox/read-all`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error(`inbox_read_all_${response.status}`);
}

export async function deleteInboxForUser(
  workspaceId: string,
  userId: string,
  messageId: string,
) {
  const response = await fetch(
    apiUrl(
      `/api/v1/workspaces/${workspaceId}/inbox/messages/${encodeURIComponent(messageId)}?userId=${encodeURIComponent(userId)}`,
    ),
    { method: 'DELETE', headers: headers() },
  );
  if (!response.ok) throw new Error(`inbox_delete_${response.status}`);
}
