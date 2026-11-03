import type { AiKnowledgeSolution } from './aiKnowledge';
export type DocumentSource = { id: string; kind: string; label: string; description?: string; url?: string; evidence?: string };
export type SolutionDocument = {
  schemaVersion: 1; id: string; title: string; summary: string; createdAt: string; model?: string;
  sourceSessionId?: string; originalQuestion?: string; understanding: Record<string,string>;
  steps: { title: string; input: string; output: string; humanCheck: string; resourceIds: string[] }[];
  deliverables: string[]; limitations: string[]; sources: DocumentSource[];
};
export function savedSolutionDocument(solution: AiKnowledgeSolution): SolutionDocument | null {
  if (solution.document?.schemaVersion === 1) return solution.document;
  const plan = solution.pilotPlan;
  if (!plan) return null;
  return { schemaVersion:1, id:solution.id, title:solution.title, summary:plan.summary, createdAt:solution.createdAt,
    model:solution.model, sourceSessionId:solution.sourceSessionId, originalQuestion:solution.originalQuestion,
    understanding:{task:solution.demand?.problem || solution.originalQuestion, goal:solution.demand?.goal || '', inputs:solution.demand?.inputs || '', output:solution.demand?.aiRole || '', constraints:solution.demand?.humanCheckpoint || ''},
    steps:plan.steps, deliverables: [...new Set(plan.steps.map(s=>s.output).filter(Boolean))], limitations:plan.limitations,
    sources:plan.sources || (solution.evidence || []).map(source=>({...source,id:source.id || ''})) };
}
