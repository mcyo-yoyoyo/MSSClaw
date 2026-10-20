import { evaluateSkillDraft } from '@/api/skillEvaluationApi';
import { flushSaveMarketplace } from '@/domain/persistence/storage';
import type { PrototypeSkillSeed, SkillEvaluationReport } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

/**
 * 上传确认后异步评测。完成时读取最新 Skill 再合并，避免覆盖用户在评测期间的编辑。
 */
export async function evaluateAndPersistSkill(
  skill: PrototypeSkillSeed,
  onStatus?: (status: 'started' | 'completed' | 'failed', report?: SkillEvaluationReport) => void,
): Promise<SkillEvaluationReport | null> {
  onStatus?.('started');
  try {
    const report = await evaluateSkillDraft(skill);
    const state = useMarketplaceStore.getState();
    const latest = state.skills.find((item) => item.id === skill.id);
    if (!latest) {
      onStatus?.('failed');
      return null;
    }
    state.upsertSkill({ ...latest, traceEvaluation: report }, false);
    const saved = useMarketplaceStore.getState();
    await flushSaveMarketplace({
        agents: saved.agents,
        skills: saved.skills,
        automations: saved.automations,
        kbDocs: saved.kbDocs,
      },
      { reportFailure: false },
    );
    onStatus?.('completed', report);
    return report;
  } catch {
    onStatus?.('failed');
    return null;
  }
}
