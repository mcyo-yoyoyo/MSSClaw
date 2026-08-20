import { apiAuthHeaders, apiUrl } from '@/api/client';

export interface AiBriefEmailSubscriptionRecord {
  workspaceId: string;
  userId: string;
  userName: string;
  email: string;
  subscribedAt: string;
  updatedAt: string;
}

function endpoint(workspaceId: string, suffix = ''): string {
  return apiUrl(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/ai-brief/subscriptions${suffix}`,
  );
}

async function apiError(res: Response, fallback: string): Promise<Error> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    return new Error(body.message || body.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function fetchMyAiBriefSubscription(
  workspaceId: string,
): Promise<AiBriefEmailSubscriptionRecord | null> {
  const res = await fetch(endpoint(workspaceId, '/me'), {
    headers: { Accept: 'application/json', ...apiAuthHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw await apiError(res, `ai_brief_subscription_me_${res.status}`);
  const body = (await res.json()) as {
    subscription?: AiBriefEmailSubscriptionRecord | null;
  };
  return body.subscription ?? null;
}

export async function subscribeAiBriefEmail(
  workspaceId: string,
  email: string,
): Promise<AiBriefEmailSubscriptionRecord> {
  const res = await fetch(endpoint(workspaceId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...apiAuthHeaders(),
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw await apiError(res, `ai_brief_subscription_post_${res.status}`);
  const body = (await res.json()) as {
    subscription?: AiBriefEmailSubscriptionRecord;
  };
  if (!body.subscription) throw new Error('ai_brief_subscription_response_missing');
  return body.subscription;
}

export async function unsubscribeAiBriefEmail(workspaceId: string): Promise<void> {
  const res = await fetch(endpoint(workspaceId, '/me'), {
    method: 'DELETE',
    headers: { Accept: 'application/json', ...apiAuthHeaders() },
  });
  if (!res.ok) throw await apiError(res, `ai_brief_subscription_delete_${res.status}`);
}

export async function fetchAiBriefSubscriptions(
  workspaceId: string,
): Promise<{ total: number; items: AiBriefEmailSubscriptionRecord[] }> {
  const res = await fetch(endpoint(workspaceId), {
    headers: { Accept: 'application/json', ...apiAuthHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw await apiError(res, `ai_brief_subscriptions_get_${res.status}`);
  return (await res.json()) as {
    total: number;
    items: AiBriefEmailSubscriptionRecord[];
  };
}
