import { z } from 'zod';
import { evidenceText, type InsightSource } from './ai-knowledge-insight.resources';

export const insightAnswerSchema = z.object({
  intro: z.string().min(2).max(400),
  findings: z.array(z.object({ title: z.string().min(2).max(90), fact: z.string().min(2).max(500),
    evidence: z.array(z.object({ sourceId: z.string(), snippetId: z.string().optional(),
      quote: z.string().trim().min(8).max(200).optional(),
    }).refine(e => Boolean(e.snippetId || e.quote), '需要原文片段编号或引用原文')).min(1).max(3),
  })).min(1).max(4),
  implication: z.string().min(2).max(700), caveat: z.string().max(500), nextStep: z.string().max(250),
});
export type InsightAnswer = z.infer<typeof insightAnswerSchema>;

/** ID有效之外，再验证每条事实都引用了候选资料里确实出现的片段。不能证明语义蕴含，需样例验收。 */
export function insightEvidenceIssue(answer: InsightAnswer, sources: InsightSource[]): string | null {
  const byId = new Map(sources.map(s => [s.id, s]));
  for (const source of sources) if (source.ref) byId.set(source.ref, source);
  for (const finding of answer.findings) for (const support of finding.evidence) {
    const source = byId.get(support.sourceId);
    if (!source) return '引用了不存在的资料ID';
    if (support.snippetId) {
      if (!source.snippets?.some(s => s.id === support.snippetId)) return '引用了不存在的原文片段编号';
      continue;
    }
    const quote = evidenceText(support.quote || '');
    if (quote.length < 8 || !evidenceText(source.description).includes(quote)) return '引用片段不是候选资料中的连续原文';
  }
  return null;
}

export function materializeInsightEvidence(answer: InsightAnswer, sources: InsightSource[]): InsightAnswer {
  return { ...answer, findings: answer.findings.map(f => ({ ...f, evidence: f.evidence.map(e => {
    const source = sources.find(s => s.id === e.sourceId || s.ref === e.sourceId);
    const snippet = e.snippetId ? source?.snippets?.find(s => s.id === e.snippetId) : undefined;
    return { ...e, sourceId: source?.id || e.sourceId, quote: snippet?.text || e.quote };
  }) })) };
}

/** 只输出字段路径与校验原因，日志不包含对话、凭证和模型全文。 */
export function insightFailureDetail(value: unknown, sources: InsightSource[]) {
  const parsed = insightAnswerSchema.safeParse(value);
  if (!parsed.success) return { code: 'insight_format', message: '洞察回答格式不完整或超出长度限制',
    fields: parsed.error.issues.map(i => `${i.path.join('.')}:${i.code}`).slice(0, 8) };
  const issue = insightEvidenceIssue(parsed.data, sources);
  return issue ? { code: 'insight_reference', message: issue, fields: [] as string[] } : null;
}

export function insightReply(answer: InsightAnswer, sources: InsightSource[], boundary: string): string {
  return [answer.intro, '关键发现', ...answer.findings.map((f, i) => {
    const indices = [...new Set(f.evidence.map(e => sources.findIndex(s => s.id === e.sourceId) + 1))];
    return `${i + 1}. ${f.title}\n${f.fact} ${indices.map(n => `[${n}]`).join('')}`;
  }), '对你的工作有什么启发', answer.implication, answer.nextStep, boundary]
    .filter(Boolean).join('\n\n');
}
