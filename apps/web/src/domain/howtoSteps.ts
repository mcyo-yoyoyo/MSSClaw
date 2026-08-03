/**
 * How to 分步呈现：将材料列表归为准备 / 连接 / 上手三章
 */

import type { PlazaToolGuide } from '@/domain/plazaToolGuides';

export type HowtoStepId = 'prepare' | 'connect' | 'use';

export type HowtoStepGroup = {
  id: HowtoStepId;
  label: string;
  hint: string;
  guides: PlazaToolGuide[];
};

const STEP_META: Record<HowtoStepId, { label: string; hint: string }> = {
  prepare: { label: '准备', hint: '账号、权限与前置条件' },
  connect: { label: '连接', hint: '开通入口、数据与环境' },
  use: { label: '上手', hint: '操作步骤与示例' },
};

function classifyGuide(g: PlazaToolGuide): HowtoStepId {
  const blob = `${g.title} ${g.blurb ?? ''} ${g.body ?? ''}`.toLowerCase();
  if (/准备|账号|权限|申请|开通|安全|须知|前置/.test(blob)) return 'prepare';
  if (/连接|接入|配置|安装|环境|数据|链接|入口/.test(blob)) return 'connect';
  if (/学习|洞察|案例|课件|准备清单|开干|执行/.test(blob)) {
    if (/准备/.test(blob)) return 'prepare';
    if (/开干|执行|打样/.test(blob)) return 'use';
  }
  // journey 三章 id 约定
  if (g.id.includes('-learn') || g.id.includes('-prepare')) {
    return g.id.includes('-prepare') ? 'prepare' : g.id.includes('-run') ? 'use' : 'connect';
  }
  if (g.id.includes('-run')) return 'use';
  if (g.type === 'text' && /步骤|操作|示例/.test(blob)) return 'use';
  return 'use';
}

/** 将扁平 guides 编成分步轨；空章不展示 */
export function groupGuidesIntoSteps(guides: PlazaToolGuide[]): HowtoStepGroup[] {
  const buckets: Record<HowtoStepId, PlazaToolGuide[]> = {
    prepare: [],
    connect: [],
    use: [],
  };
  for (const g of guides) {
    buckets[classifyGuide(g)].push(g);
  }
  // 若全挤在 use，按顺序均分为三步（演示友好）
  if (!buckets.prepare.length && !buckets.connect.length && buckets.use.length >= 3) {
    const all = buckets.use;
    const n = Math.ceil(all.length / 3);
    buckets.prepare = all.slice(0, n);
    buckets.connect = all.slice(n, n * 2);
    buckets.use = all.slice(n * 2);
  } else if (!buckets.prepare.length && !buckets.connect.length && buckets.use.length > 0) {
    // 仅一章时仍展示「上手」单步
    return [
      {
        id: 'use',
        label: STEP_META.use.label,
        hint: STEP_META.use.hint,
        guides: buckets.use,
      },
    ];
  }

  return (['prepare', 'connect', 'use'] as HowtoStepId[])
    .filter((id) => buckets[id].length > 0)
    .map((id) => ({
      id,
      label: STEP_META[id].label,
      hint: STEP_META[id].hint,
      guides: buckets[id],
    }));
}
