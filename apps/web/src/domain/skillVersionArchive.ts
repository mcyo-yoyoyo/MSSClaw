import type { PrototypeSkillSeed, SkillVersionRecord } from './prototype/types';
const key = (value: string) => value.trim().replace(/^(?:v\s*)+/i, '').toLowerCase();
/** 更新当前包前归档旧包；历史版本号不可重用。 */
export function archiveSkillVersion(previous: PrototypeSkillSeed | undefined, next: PrototypeSkillSeed): SkillVersionRecord[] | undefined {
  const versions = (previous?.versions ?? []).map(row => ({ ...row }));
  const changedPackage = Boolean(next.packageBlob && next.packageBlob.id !== previous?.packageBlob?.id);
  const changedVersion = Boolean(previous && key(previous.version) !== key(next.version));
  if (!changedPackage && !changedVersion) return previous?.versions;
  if (!key(next.version)) throw new Error('请填写版本号');
  if (previous && changedPackage && !changedVersion) throw new Error('上传新 Skill 包后，请填写新的版本号');
  if (versions.some(row => key(row.version) === key(next.version))) throw new Error('该版本号已存在，请使用新的版本号');
  if (previous) {
    const outgoing = versions.find(row => key(row.version) === key(previous.version));
    if (outgoing) outgoing.packageBlob ??= previous.packageBlob;
    else versions.unshift({ version: previous.version, packageBlob: previous.packageBlob, publishedAt: previous.updatedAt || previous.createdAt, status: 'active' });
  }
  versions.forEach(row => { row.status = 'retired'; });
  versions.unshift({ version: next.version.trim(), packageBlob: next.packageBlob, publishedAt: new Date().toISOString(), status: 'active' });
  return versions;
}
