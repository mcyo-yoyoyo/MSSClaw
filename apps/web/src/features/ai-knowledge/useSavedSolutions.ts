import { useCallback, useEffect, useState } from 'react';
import { listAiKnowledgeSolutions } from '@/api/aiKnowledgeApi';
import { isApiEnabled } from '@/api/client';
import { loadAiKnowledgeSolutions, type AiKnowledgeSolution } from '@/domain/aiKnowledge';
import { useSessionStore } from '@/stores/sessionStore';

type Entry = { solution: AiKnowledgeSolution; isLocal: boolean };
type State = { ownerId: string; entries: Entry[]; loading: boolean; error: string };
const emptyEntries: Entry[] = [];

function combine(remote: AiKnowledgeSolution[], local: AiKnowledgeSolution[], limit: number): Entry[] {
  const entries = new Map<string, Entry>();
  for (const solution of local) entries.set(solution.id, { solution, isLocal: true });
  for (const solution of remote) entries.set(solution.id, { solution, isLocal: false });
  const createdAt = (entry: Entry) => Date.parse(entry.solution.createdAt) || 0;
  return [...entries.values()].sort((a, b) => createdAt(b) - createdAt(a) || a.solution.id.localeCompare(b.solution.id)).slice(0, limit);
}

/** The home shelf and personal center read the same saved-plan collection. */
export function useSavedSolutions(limit = 50) {
  const ownerId = useSessionStore(s => s.user?.id || 'guest');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  const [state, setState] = useState<State>(() => ({
    ownerId, entries: combine([], ownerId === 'guest' ? loadAiKnowledgeSolutions() : [], limit),
    loading: isApiEnabled(), error: '',
  }));

  useEffect(() => {
    const local = ownerId === 'guest' ? loadAiKnowledgeSolutions() : [];
    const initial = { ownerId, entries: combine([], local, limit), loading: isApiEnabled(), error: '' };
    setState(initial);
    if (!isApiEnabled()) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && (useSessionStore.getState().user?.id || 'guest') === ownerId;
    void listAiKnowledgeSolutions(limit, controller.signal).then(remote => {
      if (current()) setState({ ownerId, entries: combine(remote, local, limit), loading: false, error: '' });
    }).catch(() => {
      if (current()) setState({ ...initial, loading: false, error: '历史方案暂时无法读取' });
    });
    return () => controller.abort();
  }, [ownerId, limit, revision]);

  const entries = state.ownerId === ownerId ? state.entries : emptyEntries;
  return { entries, solutions: entries.map(entry => entry.solution),
    loading: state.ownerId !== ownerId || state.loading,
    error: state.ownerId === ownerId ? state.error : '', reload };
}
