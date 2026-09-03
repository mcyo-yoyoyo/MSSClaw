import { apiAuthHeaders, apiUrl, fetchWithTimeout, isApiEnabled } from '@/api/client';
import { currentWorkspaceId } from '@/api/platformDocsApi';
import type { PrototypeSkillSeed, SkillEvaluationReport } from '@/domain/prototype/types';

function safeBody(skill: PrototypeSkillSeed) {
  return {
    name: skill.nameZh || skill.name,
    description: skill.descZh || skill.desc,
    command: skill.command,
    instructions: skill.instructions,
    planSteps: skill.planSteps,
    usageNotes: skill.usageNotes,
    cases: skill.cases,
    tags: skill.tags,
    securityScan: skill.securityScan,
  };
}

/** 服务端评测：API key 只留在服务端，上传正文按字段裁剪后再发送。 */
export async function evaluateSkillDraft(skill: PrototypeSkillSeed): Promise<SkillEvaluationReport> {
  if (!isApiEnabled()) throw new Error('skill_evaluation_api_disabled');
  const workspaceId = currentWorkspaceId().trim();
  if (!workspaceId) throw new Error('skill_evaluation_workspace_missing');
  const response = await fetchWithTimeout(
    apiUrl(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/skills/evaluate`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...apiAuthHeaders(),
      },
      body: JSON.stringify(safeBody(skill)),
    },
    55_000,
  );
  const body = (await response.json().catch(() => null)) as { status?: unknown } | null;
  if (!response.ok || !body || !body.status) {
    throw new Error(`skill_evaluation_http_${response.status || 'unknown'}`);
  }
  return body as unknown as SkillEvaluationReport;
}
