/** 侧栏可读的任务标题长度（汉字/字符） */
export const TASK_TITLE_MAX_LEN = 18;

const FILLER_PREFIX =
  /^(请你?|麻烦你?|帮我|帮忙|烦请|劳烦|可否|能否|想要|希望|需要)?(帮我|帮忙|为我|给我)?(一下|下)?/;

const ACTION_TRIM =
  /^(请|帮我|帮忙|麻烦)?(生成|撰写|起草|输出|分析|整理|汇总|总结|编写|完成|执行|创建|制作|给出|提供)/;

/**
 * 从用户输入/首条消息提炼短任务名（规则优先，即时可用）。
 */
export function deriveTaskTitle(
  raw: string,
  opts?: { agentName?: string; skillName?: string; maxLen?: number },
): string {
  const maxLen = opts?.maxLen ?? TASK_TITLE_MAX_LEN;
  let text = (raw ?? '').trim();
  if (!text) return fallbackTitle(opts?.agentName, opts?.skillName);

  // 附件引用行不进标题
  text = text
    .split('\n')
    .filter((line) => !/^\s*📎/.test(line) && !/附件[：:]/.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 去掉开头 @专家
  text = text.replace(/^(?:@\S+\s*)+/, '').trim();

  // /技能指令：优先用技能名
  const skillMatch = text.match(/^\/([^\s]+)(?:\s+([\s\S]*))?$/);
  if (skillMatch) {
    if (opts?.skillName?.trim()) return clampTitle(opts.skillName.trim(), maxLen);
    const rest = (skillMatch[2] ?? '').trim();
    if (rest) text = rest;
    else return clampTitle(skillMatch[1]!.replace(/^\/+/, ''), maxLen);
  }

  // 取首句 / 首分句
  text = text.split(/[。！？!?\n；;]/)[0]?.trim() ?? text;
  const comma = text.search(/[，,]/);
  if (comma > 6 && comma < maxLen + 4) {
    text = text.slice(0, comma).trim();
  }

  text = text.replace(FILLER_PREFIX, '').trim();
  // 保留动作语义：若去掉「生成/分析」后过短则保留动作词
  const withoutAction = text.replace(ACTION_TRIM, '').trim();
  if (withoutAction.length >= 4) text = withoutAction;

  text = text.replace(/^[:：\-\s]+/, '').replace(/[“”"']/g, '').trim();

  if (!text || text.length < 2) return fallbackTitle(opts?.agentName, opts?.skillName);
  return clampTitle(text, maxLen);
}

export function clampTitle(title: string, maxLen = TASK_TITLE_MAX_LEN): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  // 尽量在词边界截断
  const slice = t.slice(0, maxLen);
  const breakAt = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('·'), slice.lastIndexOf('-'));
  if (breakAt >= Math.floor(maxLen * 0.55)) {
    return `${slice.slice(0, breakAt).trimEnd()}…`;
  }
  return `${slice.trimEnd()}…`;
}

function fallbackTitle(agentName?: string, skillName?: string): string {
  if (skillName?.trim()) return clampTitle(skillName.trim());
  if (agentName?.trim()) {
    const short = agentName.replace(/\s*Agent\s*/gi, '').trim();
    return short ? `${short}任务` : '新任务';
  }
  return '新任务';
}

/** 校验 AI 回写标题是否可用 */
export function isUsableAiTaskTitle(title: string, maxLen = TASK_TITLE_MAX_LEN): boolean {
  const t = title.replace(/[\r\n]+/g, ' ').trim();
  if (t.length < 2 || t.length > maxLen + 4) return false;
  if (/^(标题|任务名|如下|以下)/.test(t)) return false;
  if (/[。！？!?]/.test(t)) return false;
  return true;
}
