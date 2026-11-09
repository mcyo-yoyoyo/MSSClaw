import { z } from 'zod';
export const SkillRunSchema = z.object({
  id: z.string(), status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'timeout']), error: z.string().nullable().optional(),
  artifacts: z.array(z.object({ id: z.string(), name: z.string(), mimeType: z.string(), size: z.number() })),
});
export type SkillRun = z.infer<typeof SkillRunSchema>;
export const SkillRunEventSchema = z.object({ seq: z.number(), type: z.string(), payload: z.record(z.unknown()) });
export type SkillRunEvent = z.infer<typeof SkillRunEventSchema>;
