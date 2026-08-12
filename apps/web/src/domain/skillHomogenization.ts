/** Skill 同质化识别（无模型：标签 / 场景 / 领域 Jaccard） */

import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { resolveSkillBusinessScenario } from '@/domain/skillBusinessScenarios';
import { skillDisplayName } from '@/domain/skillDisplay';

export type HomogenizationHit = {
  skillId: string;
  peerId: string;
  skillName: string;
  peerName: string;
  similarity: number;
  overlap: string[];
  suggestion: string;
};

function tokensOf(skill: PrototypeSkillSeed): Set<string> {
  const name = skillDisplayName(skill).toLowerCase();
  const parts = name
    .split(/[\s\-_/·，,、]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const tags = (skill.tags ?? []).map((t) => t.toLowerCase());
  const biz = resolveSkillBusinessScenario(skill);
  const dept = skill.ownerDeptIds?.[0];
  const set = new Set<string>([...parts, ...tags]);
  if (biz) set.add(`biz:${biz}`);
  if (dept) set.add(`dept:${dept}`);
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): { score: number; overlap: string[] } {
  if (!a.size || !b.size) return { score: 0, overlap: [] };
  const overlap: string[] = [];
  for (const x of a) if (b.has(x)) overlap.push(x);
  const union = new Set([...a, ...b]);
  return { score: overlap.length / union.size, overlap };
}

function suggestion(score: number): string {
  if (score >= 0.75) return '建议合并或下线其一，保留覆盖面更全的版本';
  if (score >= 0.6) return '建议对比差异后优化命名与标签，避免重复上架';
  return '可关注后续迭代是否进一步趋同';
}

/** 成对扫描；默认阈值 0.55 */
export function findHomogenizationHits(
  skills: PrototypeSkillSeed[],
  threshold = 0.55,
): HomogenizationHit[] {
  const hits: HomogenizationHit[] = [];
  const tokenCache = new Map<string, Set<string>>();
  const getTokens = (s: PrototypeSkillSeed) => {
    let t = tokenCache.get(s.id);
    if (!t) {
      t = tokensOf(s);
      tokenCache.set(s.id, t);
    }
    return t;
  };

  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i];
      const b = skills[j];
      const { score, overlap } = jaccard(getTokens(a), getTokens(b));
      if (score < threshold) continue;
      hits.push({
        skillId: a.id,
        peerId: b.id,
        skillName: skillDisplayName(a),
        peerName: skillDisplayName(b),
        similarity: Math.round(score * 100),
        overlap: overlap.filter((x) => !x.startsWith('biz:') && !x.startsWith('dept:')).slice(0, 6),
        suggestion: suggestion(score),
      });
    }
  }
  return hits.sort((x, y) => y.similarity - x.similarity);
}

export function homogenizationWarningCount(skills: PrototypeSkillSeed[]): number {
  return findHomogenizationHits(skills).length;
}
