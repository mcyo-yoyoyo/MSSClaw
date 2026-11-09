import { apiUrl, apiAuthHeaders } from '@/api/client';
import { SkillRunSchema, SkillRunEventSchema } from '@/domain/skillRun';
async function request(path: string, body?: unknown) {
  const response = await fetch(apiUrl(`/api/v1/skill-runs${path}`), { method: body === undefined ? 'GET' : 'POST', headers: { ...apiAuthHeaders(), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || `HTTP ${response.status}`);
  return response.json();
}
export async function uploadSkillInput(file: File): Promise<string> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result).split(',')[1]!); reader.readAsDataURL(file);
  });
  return (await request('/inputs', { name: file.name, mimeType: file.type, dataBase64 })).id;
}
export async function createSkillRun(skillId: string, inputBlobIds: string[]) {
  const result = await request('', { skillId, inputBlobIds });
  if (result.mode === 'prompt') return { fallback: true as const, message: String(result.message) };
  return { fallback: false as const, run: SkillRunSchema.parse(result) };
}
export async function getSkillRun(id: string) { return SkillRunSchema.parse(await request(`/${id}`)); }
export async function getSkillRunEvents(id: string, after: number) { return SkillRunEventSchema.array().parse(await request(`/${id}/events?afterSeq=${after}`)); }
export async function cancelSkillRun(id: string) { return request(`/${id}/cancel`, {}); }
export async function downloadSkillArtifact(id: string, blobId: string, name: string) {
  const response = await fetch(apiUrl(`/api/v1/skill-runs/${id}/artifacts/${blobId}`), { headers: apiAuthHeaders() });
  if (!response.ok) throw new Error(`下载失败：HTTP ${response.status}`);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
