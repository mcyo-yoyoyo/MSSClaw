import { apiAuthHeaders, apiUrl, fetchWithTimeout } from '@/api/client';
import type { AiKnowledgeSolution, DemandDraft, DemandSummary } from '@/domain/aiKnowledge';
import { getVisitorId } from '@/domain/visitorIdentity';
import { useWorkspaceStore } from '@/stores/workspaceStore';

function workspaceId(): string {
  return useWorkspaceStore.getState().workspaceId || 'ws-mss-ai';
}

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Visitor-Id': getVisitorId(),
    ...apiAuthHeaders(),
  };
}

function endpoint(path: string): string {
  return apiUrl(`/api/v1/workspaces/${workspaceId()}/ai-knowledge${path}`);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const res = await fetchWithTimeout(
    endpoint(path),
    { ...init, headers: { ...headers(), ...(init.headers ?? {}) } },
    timeoutMs,
  );
  if (!res.ok) {
    let detail = `HTTP_${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[]; error?: string };
      detail = Array.isArray(body.message)
        ? body.message.join('；')
        : body.message || body.error || detail;
    } catch {
      /* keep status */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export function canUseAiKnowledgeApi(): boolean {
  return useWorkspaceStore.getState().apiConnected;
}

export async function startAiKnowledgeDraft(question: string, signal?: AbortSignal): Promise<DemandDraft> {
  const body = await request<{ draft: DemandDraft }>('/drafts', {
    method: 'POST',
    body: JSON.stringify({ question }),
    signal,
  });
  return body.draft;
}

export async function clarifyAiKnowledgeDraft(
  draftId: string,
  message: string,
  signal?: AbortSignal,
): Promise<DemandDraft> {
  const body = await request<{ draft: DemandDraft }>(`/drafts/${encodeURIComponent(draftId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
    signal,
  });
  return body.draft;
}

export async function updateAiKnowledgeDemand(
  draftId: string,
  demand: DemandSummary,
  signal?: AbortSignal,
): Promise<DemandDraft> {
  const body = await request<{ draft: DemandDraft }>(`/drafts/${encodeURIComponent(draftId)}/demand`, {
    method: 'PATCH',
    body: JSON.stringify({ demand }),
    signal,
  });
  return body.draft;
}

export async function generateAiKnowledgeSolution(draftId: string, signal?: AbortSignal): Promise<AiKnowledgeSolution> {
  const body = await request<{ solution: AiKnowledgeSolution }>(
    `/drafts/${encodeURIComponent(draftId)}/generate`,
    { method: 'POST', body: '{}', signal },
    90_000,
  );
  return body.solution;
}

export async function listAiKnowledgeSolutions(limit = 50): Promise<AiKnowledgeSolution[]> {
  const body = await request<{ solutions: AiKnowledgeSolution[] }>(`/solutions?limit=${limit}`);
  return body.solutions;
}
