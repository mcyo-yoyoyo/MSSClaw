import { evaluateSkillDraft } from '@/api/skillEvaluationApi';
import { currentWorkspaceId } from '@/api/platformDocsApi';
import { flushSaveMarketplace } from '@/domain/persistence/storage';
import type { PrototypeSkillSeed, SkillEvaluationReport } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

/**
 * 上传确认后异步评测。完成时读取最新 Skill 再合并，避免覆盖用户在评测期间的编辑。
 */
export async function evaluateAndPersistSkill(
  skill: PrototypeSkillSeed,
  onStatus?: (status: 'started' | 'completed' | 'failed', report?: SkillEvaluationReport) => void,
): Promise<SkillEvaluationReport | null> {
  const workspaceId = currentWorkspaceId();
  onStatus?.('started');
  try {
    const report = await evaluateSkillDraft(skill);
    if (useWorkspaceStore.getState().workspaceId !== workspaceId) {
      onStatus?.('failed');
      return null;
    }
    const state = useMarketplaceStore.getState();
    const latest = state.skills.find((item) => item.id === skill.id);
    if (!latest) {
      onStatus?.('failed');
      return null;
    }
    state.upsertSkill({ ...latest, traceEvaluation: report }, false);
    const saved = useMarketplaceStore.getState();
    await flushSaveMarketplace(
      workspaceId,
      {
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
