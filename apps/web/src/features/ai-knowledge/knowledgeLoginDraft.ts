import { useSessionStore } from '@/stores/sessionStore';
import { useAuthGateStore } from '@/stores/authGateStore';
import type { KnowledgeMode } from './KnowledgeDock';

type LoginDraft = { text: string; mode: KnowledgeMode; returnHome: boolean };
// Only survives the current login flow, not page reloads or account switches.
let pending: { draft: LoginDraft; owner: string | null } | null = null;

export function stageKnowledgeLoginDraft(draft: LoginDraft): void {
  if (!useSessionStore.getState().isAuthenticated) pending = { draft, owner: null };
}

export function takeKnowledgeLoginDraft(owner: string): LoginDraft | null {
  if (!pending || pending.owner !== owner) return null;
  const draft = pending.draft;
  pending = null;
  return draft;
}

useSessionStore.subscribe((state, previous) => {
  if (!pending) return;
  const owner = state.isAuthenticated ? state.user?.id : undefined;
  const previousOwner = previous.isAuthenticated ? previous.user?.id : undefined;
  if (owner === previousOwner) return;
  if (!previousOwner && owner && pending.owner === null) pending.owner = owner;
  else pending = null;
});

useAuthGateStore.subscribe((state, previous) => {
  if (previous.open && !state.open && !useSessionStore.getState().isAuthenticated) pending = null;
});
