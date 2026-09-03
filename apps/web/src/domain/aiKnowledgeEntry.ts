import type { IntentSearchScope } from '@/domain/capabilityIntentSearch';
import type { AiKnowledgeSolution } from '@/domain/aiKnowledge';

const AI_KNOWLEDGE_ENTRY_KEY = 'mss-ai-knowledge-entry-v1';
const AI_KNOWLEDGE_SOLUTION_KEY = 'mss-ai-knowledge-solution-entry-v1';
const ME_AI_KNOWLEDGE_TAB_KEY = 'mss-me-ai-knowledge-tab-v1';

export type AiKnowledgeEntryIntent = {
  question: string;
  source: IntentSearchScope;
  createdAt: string;
};

export function stageAiKnowledgeEntry(question: string, source: IntentSearchScope): void {
  const clean = question.trim();
  if (!clean) return;
  const intent: AiKnowledgeEntryIntent = {
    question: clean,
    source,
    createdAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(AI_KNOWLEDGE_ENTRY_KEY, JSON.stringify(intent));
}

export function consumeAiKnowledgeEntry(): AiKnowledgeEntryIntent | null {
  const raw = window.sessionStorage.getItem(AI_KNOWLEDGE_ENTRY_KEY);
  window.sessionStorage.removeItem(AI_KNOWLEDGE_ENTRY_KEY);
  if (!raw) return null;
  try {
    const intent = JSON.parse(raw) as Partial<AiKnowledgeEntryIntent>;
    if (typeof intent.question !== 'string' || !intent.question.trim()) return null;
    return {
      question: intent.question.trim(),
      source: intent.source ?? 'home',
      createdAt: typeof intent.createdAt === 'string' ? intent.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function stageAiKnowledgeSolution(solution: AiKnowledgeSolution): void {
  window.sessionStorage.setItem(AI_KNOWLEDGE_SOLUTION_KEY, JSON.stringify(solution));
}

export function consumeAiKnowledgeSolution(): AiKnowledgeSolution | null {
  const raw = window.sessionStorage.getItem(AI_KNOWLEDGE_SOLUTION_KEY);
  window.sessionStorage.removeItem(AI_KNOWLEDGE_SOLUTION_KEY);
  if (!raw) return null;
  try {
    const solution = JSON.parse(raw) as Partial<AiKnowledgeSolution>;
    if (typeof solution.id !== 'string' || typeof solution.title !== 'string' || !solution.demand) {
      return null;
    }
    return solution as AiKnowledgeSolution;
  } catch {
    return null;
  }
}

export function stageMeAiKnowledgeTab(): void {
  window.sessionStorage.setItem(ME_AI_KNOWLEDGE_TAB_KEY, '1');
}

export function consumeMeAiKnowledgeTab(): boolean {
  const staged = window.sessionStorage.getItem(ME_AI_KNOWLEDGE_TAB_KEY) === '1';
  window.sessionStorage.removeItem(ME_AI_KNOWLEDGE_TAB_KEY);
  return staged;
}
