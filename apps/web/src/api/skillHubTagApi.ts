import { apiAuthHeaders, apiUrl, fetchWithTimeout, isApiEnabled } from '@/api/client';
import { DATA_FETCH_FAILED_MESSAGE } from '@/domain/dataFetchNotice';
import {
  skillHubTagsFromModel,
  type SkillHubTags,
} from '@/domain/skillHubTags';

export async function requestSkillHubTags(input: {
  name?: string;
  description?: string;
  instructions?: string;
  previous?: SkillHubTags;
}): Promise<SkillHubTags> {
  if (!isApiEnabled()) throw new Error('未连接后端，无法调用模型');
  const response = await fetchWithTimeout(
    apiUrl('/api/v1/skills/hub-tags'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...apiAuthHeaders(),
      },
      body: JSON.stringify({
        name: input.name ?? '',
        description: input.description ?? '',
        instructions: input.instructions ?? '',
      }),
    },
    55_000,
  );
  const body = (await response.json().catch(() => null)) as {
    ok?: unknown;
    message?: unknown;
    tags?: unknown;
  } | null;
  if (!response.ok || !body) throw new Error(DATA_FETCH_FAILED_MESSAGE);
  if (body.ok !== true) {
    throw new Error(typeof body.message === 'string' && body.message.trim() ? body.message : '模型未能提炼标签');
  }
  const tags = skillHubTagsFromModel(body.tags, input.previous);
  if (!tags) throw new Error('模型未返回可识别的标签结果');
  return tags;
}
