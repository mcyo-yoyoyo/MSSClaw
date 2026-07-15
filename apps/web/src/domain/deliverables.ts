import { downloadBlob } from '@/lib/download';
import type { KbArtifact } from '@/domain/kbSearch';

export type DeliverableKind = 'markdown' | 'html' | 'pdf' | 'ppt' | 'xlsx' | 'board' | 'knowledge';

export interface DeliverablePreview {
  id: string;
  kind: DeliverableKind;
  name: string;
  title: string;
  size: string;
  icon: string;
  iconClass: string;
  markdown?: string;
  html?: string;
  slides?: { title: string; bullets: string[] }[];
  pdfPages?: { heading: string; body: string }[];
  /** xlsx 预览用表格 */
  table?: { headers: string[]; rows: string[][] };
}

export interface BuildDeliverablesContext {
  type: 'marketing' | 'knowledge';
  query: string;
  agentName?: string;
  skills?: string[];
  agentReply?: string;
  kbArtifact?: KbArtifact | null;
}

/** @deprecated 兼容旧下载列表；请优先用 buildDeliverablePreviews */
export interface DeliverableItem {
  id: string;
  icon: string;
  iconClass: string;
  name: string;
  size: string;
  onDownload: () => void;
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function skillLine(skills?: string[]) {
  return skills?.length ? skills.join(' · ') : '（未挂载 Skill）';
}

function stripReply(reply?: string) {
  const t = (reply ?? '').trim();
  if (!t) return '';
  return t.length > 1200 ? `${t.slice(0, 1200)}…` : t;
}

function marketingMarkdown(ctx: BuildDeliverablesContext) {
  const reply = stripReply(ctx.agentReply);
  return [
    `# 任务交付报告`,
    '',
    `> Agent：${ctx.agentName || '数据分析 Agent'}  ·  Skill：${skillLine(ctx.skills)}`,
    '',
    `## 任务目标`,
    '',
    ctx.query || '（未填写）',
    '',
    `## 执行摘要`,
    '',
    reply ||
      [
        '- 拉美穿戴 SO 环比 **+8.2%**，墨西哥、阿根廷贡献主要增量',
        '- 竞品降价对巴西影响显著，建议启动 NBA 补贴券策略',
        '- IoT 剔除后排名稳定，渠道促销为首要归因因子',
      ].join('\n'),
    '',
    `## 下一步`,
    '',
    '1. 复核巴西价盘与竞品价差',
    '2. 同步渠道与代表处执行 NBA',
    '3. 下周复盘 SO / 转化交叉指标',
    '',
    `---`,
    `*生成时间：${new Date().toLocaleString('zh-CN')}*`,
  ].join('\n');
}

function marketingHtml(ctx: BuildDeliverablesContext) {
  const mdBits = esc(ctx.query || '营销分析任务');
  const agent = esc(ctx.agentName || '数据分析 Agent');
  const skills = esc(skillLine(ctx.skills));
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"/><title>执行简报</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f6f7f9;color:#1d1d1f}
  .card{max-width:640px;margin:24px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
  h1{font-size:20px;margin:0 0 8px} .meta{font-size:12px;color:#86868b;margin-bottom:20px}
  .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
  .kpi div{background:#fafafa;border:1px solid #eee;border-radius:12px;padding:12px;text-align:center}
  .kpi b{display:block;font-size:18px;margin-top:4px} .kpi span{font-size:11px;color:#86868b}
  ul{padding-left:18px;font-size:13px;line-height:1.7}
</style></head><body>
<div class="card">
  <h1>执行简报 · HTML</h1>
  <p class="meta">${agent} · ${skills}</p>
  <p style="font-size:13px;line-height:1.6"><strong>任务：</strong>${mdBits}</p>
  <div class="kpi">
    <div><span>SO 环比</span><b>+8.2%</b></div>
    <div><span>TOP 代表处</span><b>墨西哥</b></div>
    <div><span>风险市场</span><b>巴西</b></div>
  </div>
  <ul>
    <li>渠道促销为主要归因因子</li>
    <li>建议巴西启动 NBA 补贴券</li>
    <li>IoT 剔除后排名稳定</li>
  </ul>
</div></body></html>`;
}

function knowledgeMarkdown(ctx: BuildDeliverablesContext) {
  const reply = stripReply(ctx.agentReply);
  const cites =
    ctx.kbArtifact?.citations
      ?.slice(0, 4)
      .map((c, i) => `${i + 1}. **${c.docTitle}** — ${c.snippet?.slice(0, 80) || c.docId}`)
      .join('\n') || '1. 拉美合规准入指南\n2. 3C 营销话术规范';

  return [
    `# 知识检索交付`,
    '',
    `> Agent：${ctx.agentName || '知识 Agent'}  ·  Skill：${skillLine(ctx.skills)}`,
    '',
    `## 查询`,
    '',
    ctx.query || '（未填写）',
    '',
    `## 结论`,
    '',
    reply ||
      [
        '- 可穿戴营销物料需避免未获批医疗功效表述',
        '- 建议提交 MKT 合规复核后再对外发布',
        '- 引用已按密级与可见性过滤',
      ].join('\n'),
    '',
    `## 引用来源`,
    '',
    cites,
    '',
    `---`,
    `*生成时间：${new Date().toLocaleString('zh-CN')}*`,
  ].join('\n');
}

function knowledgeHtml(ctx: BuildDeliverablesContext) {
  const q = esc(ctx.query || '知识检索');
  const agent = esc(ctx.agentName || '知识 Agent');
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"/><title>合规筛查报告</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f4f5f7;color:#1d1d1f}
  .wrap{max-width:680px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.06)}
  .hd{background:#18181b;color:#fff;padding:18px 24px} .hd h1{margin:0;font-size:18px}
  .bd{padding:22px 24px;font-size:13px;line-height:1.7}
  .tag{display:inline-block;background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600}
</style></head><body>
<div class="wrap">
  <div class="hd"><h1>合规筛查报告</h1><p style="margin:6px 0 0;opacity:.7;font-size:12px">${agent}</p></div>
  <div class="bd">
    <p><span class="tag">需复核</span></p>
    <p><strong>查询：</strong>${q}</p>
    <p>检测到潜在医疗功效表述风险，建议删除或改为「健康管理」类合规用语，并附引用溯源后再发布。</p>
  </div>
</div></body></html>`;
}

/** 构建与当前任务上下文匹配的可预览交付件 */
export function buildDeliverablePreviews(ctx: BuildDeliverablesContext): DeliverablePreview[] {
  const q = ctx.query || '';
  const agent = ctx.agentName || (ctx.type === 'marketing' ? '数据分析 Agent' : '知识 Agent');

  if (ctx.type === 'marketing') {
    const md = marketingMarkdown(ctx);
    const html = marketingHtml(ctx);
    return [
      {
        id: 'm-md',
        kind: 'markdown',
        name: '任务报告.md',
        title: 'Markdown 报告',
        size: '12 KB',
        icon: 'fa-file-lines',
        iconClass: 'text-zinc-700',
        markdown: md,
      },
      {
        id: 'm-html',
        kind: 'html',
        name: '执行简报.html',
        title: 'HTML 报告',
        size: '18 KB',
        icon: 'fa-file-code',
        iconClass: 'text-orange-600',
        html,
      },
      {
        id: 'm-ppt',
        kind: 'ppt',
        name: '策略汇报.pptx',
        title: 'PPT 预览',
        size: '2.4 MB',
        icon: 'fa-file-powerpoint',
        iconClass: 'text-amber-600',
        slides: [
          {
            title: '任务背景',
            bullets: [`Agent：${agent}`, `Skill：${skillLine(ctx.skills)}`, q || '多源数据分析'],
          },
          {
            title: '核心发现',
            bullets: ['SO 环比 +8.2%', '墨西哥领先，巴西承压', '渠道促销为首要归因'],
          },
          {
            title: '行动建议',
            bullets: ['巴西启动 NBA', '复核价盘与竞品', '下周复盘转化指标'],
          },
        ],
      },
      {
        id: 'm-pdf',
        kind: 'pdf',
        name: '策略摘要.pdf',
        title: 'PDF 预览',
        size: '126 KB',
        icon: 'fa-file-pdf',
        iconClass: 'text-red-500',
        pdfPages: [
          {
            heading: '策略摘要',
            body: `任务：${q || '营销数据分析'}\n执行 Agent：${agent}\n\n结论：拉美穿戴 SO 环比提升，建议对巴西市场采取补贴券策略，并持续监测竞品价盘。`,
          },
          {
            heading: '附录 · Skill 轨迹',
            body: `挂载 Skill：${skillLine(ctx.skills)}\n\n本页为演示 PDF 排版；导出可下载文本摘要。`,
          },
        ],
      },
      {
        id: 'm-xlsx',
        kind: 'xlsx',
        name: 'Q3归因报告.xlsx',
        title: '表格预览',
        size: '842 KB',
        icon: 'fa-file-excel',
        iconClass: 'text-emerald-600',
        table: {
          headers: ['代表处', 'SO排名', '环比', '归因因子'],
          rows: [
            ['墨西哥', '1', '+12.4%', '渠道促销'],
            ['巴西', '2', '-3.1%', '竞品降价'],
            ['阿根廷', '3', '+5.8%', '新品上市'],
          ],
        },
      },
      {
        id: 'm-board',
        kind: 'board',
        name: '分析看板',
        title: '交互看板',
        size: '实时',
        icon: 'fa-chart-column',
        iconClass: 'text-claw-600',
      },
    ];
  }

  const md = knowledgeMarkdown(ctx);
  const html = knowledgeHtml(ctx);
  return [
    {
      id: 'k-md',
      kind: 'markdown',
      name: '检索摘要.md',
      title: 'Markdown 摘要',
      size: '8 KB',
      icon: 'fa-file-lines',
      iconClass: 'text-zinc-700',
      markdown: md,
    },
    {
      id: 'k-html',
      kind: 'html',
      name: '合规报告.html',
      title: 'HTML 报告',
      size: '14 KB',
      icon: 'fa-file-code',
      iconClass: 'text-orange-600',
      html,
    },
    {
      id: 'k-pdf',
      kind: 'pdf',
      name: '溯源简报.pdf',
      title: 'PDF 预览',
      size: '96 KB',
      icon: 'fa-file-pdf',
      iconClass: 'text-red-500',
      pdfPages: [
        {
          heading: '知识检索简报',
          body: `查询：${q || '知识检索'}\nAgent：${agent}\n\n${stripReply(ctx.agentReply) || '已完成向量检索与重排，结论见 Markdown 摘要。'}`,
        },
        {
          heading: '引用清单',
          body: (ctx.kbArtifact?.citations ?? [])
            .slice(0, 5)
            .map((c, i) => `${i + 1}. ${c.docTitle}`)
            .join('\n') || '1. 拉美合规准入指南\n2. 3C 营销话术规范',
        },
      ],
    },
    {
      id: 'k-ppt',
      kind: 'ppt',
      name: '赋能汇报.pptx',
      title: 'PPT 预览',
      size: '1.6 MB',
      icon: 'fa-file-powerpoint',
      iconClass: 'text-amber-600',
      slides: [
        {
          title: '检索任务',
          bullets: [`Agent：${agent}`, `Skill：${skillLine(ctx.skills)}`, q || '合规 / SOP 检索'],
        },
        {
          title: '关键结论',
          bullets: ['避免未获批医疗功效表述', '提交合规复核', '保留引用溯源'],
        },
      ],
    },
    {
      id: 'k-card',
      kind: 'knowledge',
      name: '溯源卡片',
      title: '引用卡片',
      size: '实时',
      icon: 'fa-book-open',
      iconClass: 'text-claw-600',
    },
  ];
}

export function downloadDeliverable(item: DeliverablePreview, query = '') {
  if (item.kind === 'markdown' && item.markdown) {
    downloadBlob(item.name, item.markdown, 'text/markdown;charset=utf-8');
    return;
  }
  if (item.kind === 'html' && item.html) {
    downloadBlob(item.name, item.html, 'text/html;charset=utf-8');
    return;
  }
  if (item.kind === 'pdf' && item.pdfPages) {
    downloadBlob(
      item.name.replace(/\.pdf$/i, '.txt'),
      item.pdfPages.map((p) => `# ${p.heading}\n\n${p.body}`).join('\n\n---\n\n'),
      'text/plain;charset=utf-8',
    );
    return;
  }
  if (item.kind === 'ppt' && item.slides) {
    downloadBlob(
      item.name.replace(/\.pptx$/i, '.md'),
      item.slides.map((s, i) => `## Slide ${i + 1}: ${s.title}\n\n${s.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n\n'),
      'text/markdown;charset=utf-8',
    );
    return;
  }
  if (item.kind === 'xlsx' && item.table) {
    const csv = [item.table.headers.join(','), ...item.table.rows.map((r) => r.join(','))].join('\n');
    downloadBlob(item.name.replace(/\.xlsx$/i, '.csv'), `${csv}\n# ${query}`, 'text/csv;charset=utf-8');
    return;
  }
  downloadBlob(
    `${item.name}.json`,
    JSON.stringify({ id: item.id, kind: item.kind, query, exportedAt: new Date().toISOString() }, null, 2),
  );
}

/** 旧接口：仅下载列表 */
export function buildDeliverables(
  type: 'marketing' | 'knowledge',
  query = '',
): DeliverableItem[] {
  return buildDeliverablePreviews({ type, query }).map((item) => ({
    id: item.id,
    icon: item.icon,
    iconClass: item.iconClass,
    name: item.name,
    size: item.size,
    onDownload: () => downloadDeliverable(item, query),
  }));
}
