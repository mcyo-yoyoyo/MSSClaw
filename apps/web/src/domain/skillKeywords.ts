/**
 * Skill 搜索关键词建议（1.0 本地启发式，模拟「模型识别」）。
 * 2.0 可替换为平台侧模型抽取同一接口。
 */

const STOP = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'you', 'are', 'was',
  '的', '了', '和', '与', '及', '在', '是', '为', '对', '等', '或', '并', '将', '把',
  '一个', '可以', '进行', '使用', '通过', '以及', '我们', '用户', '技能', 'skill',
]);

function pushUnique(out: string[], seen: Set<string>, token: string) {
  const t = token.trim();
  if (t.length < 2 || t.length > 24) return;
  const key = t.toLowerCase();
  if (STOP.has(key) || seen.has(key)) return;
  seen.add(key);
  out.push(t);
}

/** 从中英文名称、描述、正文抽取搜索关键词标签 */
export function suggestSkillSearchKeywords(input: {
  nameZh?: string;
  nameEn?: string;
  descZh?: string;
  descEn?: string;
  instructions?: string;
  command?: string;
  existingTags?: string[];
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const t of input.existingTags ?? []) pushUnique(out, seen, t);

  const cmd = input.command?.replace(/^\//, '').trim();
  if (cmd) pushUnique(out, seen, cmd);

  const blob = [input.nameZh, input.nameEn, input.descZh, input.descEn, input.instructions]
    .filter(Boolean)
    .join('\n');

  // 英文词
  for (const m of blob.matchAll(/[A-Za-z][A-Za-z0-9_-]{2,}/g)) {
    pushUnique(out, seen, m[0]!);
    if (out.length >= 16) break;
  }

  // 中文 2–6 字片段（简单滑窗 + 常见业务词优先）
  const bizHints = [
    '价格监测', '评论分析', '客诉', '合规', '本地化', '翻译', '报表', '结算',
    '话术', '陪练', '知识', '检索', '采集', '周报', '打样', '运营', '商城', '电渠',
  ];
  for (const h of bizHints) {
    if (blob.includes(h)) pushUnique(out, seen, h);
  }

  const zh = blob.replace(/[^\u4e00-\u9fff]+/g, ' ');
  for (const part of zh.split(/\s+/)) {
    if (part.length >= 2 && part.length <= 6) pushUnique(out, seen, part);
    if (out.length >= 16) break;
  }

  return out.slice(0, 12);
}
