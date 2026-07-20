import { downloadBlob } from '@/lib/download';
import type { KbArtifact } from '@/domain/kbSearch';
import { isLlmConfigured } from '@/api/llmClient';
import {
  generateDeliverableFormatWithLlm,
  generateHtmlAnalysisBoardWithLlm,
} from '@/api/deliverableLlm';
import { markdownToHtmlFragment } from '@/domain/markdownRender';
import {
  ANALYSIS_REPORT_CSS,
  buildAnalysisDashboardHtml,
  buildLocalAnalysisBoardData,
  mergeAnalysisBoardData,
  type AnalysisBoardData,
} from '@/domain/htmlReportAnalysis';
import {
  buildPptDeckFromMarkdown,
  finalizePptDeck,
  type PptSlide,
} from '@/domain/pptSlides';
import { downloadPptx } from '@/domain/pptxExport';

export type DeliverableKind = 'markdown' | 'html' | 'ppt' | 'xlsx' | 'board' | 'knowledge';

export type GeneratableKind = 'html' | 'ppt';

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
  slides?: PptSlide[];
  /** xlsx 预览用表格 */
  table?: { headers: string[]; rows: string[][] };
  /** 是否仍待基于 Markdown 生成（HTML/PPT） */
  pendingGenerate?: boolean;
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

function skillLine(skills?: string[]) {
  return skills?.length ? skills.join(' · ') : '（未挂载 Skill）';
}

/** 保留 Agent 回复主体，避免 Markdown 源头就丢内容 */
function stripReply(reply?: string) {
  const t = (reply ?? '').trim();
  if (!t) return '';
  return t.length > 8000 ? `${t.slice(0, 8000)}\n\n…（后续内容已截断）` : t;
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

function knowledgeMarkdown(ctx: BuildDeliverablesContext) {
  const reply = stripReply(ctx.agentReply);
  const cites =
    ctx.kbArtifact?.citations
      ?.slice(0, 8)
      .map((c, i) => `${i + 1}. **${c.docTitle}** — ${c.snippet?.slice(0, 120) || c.docId}`)
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

function wrapReportHtml(
  bodyHtml: string,
  meta: {
    title: string;
    agent: string;
    query: string;
    analysisHtml?: string;
  },
) {
  const q = meta.query ? meta.query.slice(0, 80) : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeAttr(meta.title)}</title>
<style>
  :root {
    --ink: #18181b;
    --muted: #71717a;
    --line: #e4e4e7;
    --bg: #f4f4f5;
    --card: #ffffff;
    --accent: #0f766e;
    --accent-soft: #ccfbf1;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background:
      radial-gradient(1200px 400px at 10% -10%, #d1fae5 0%, transparent 55%),
      radial-gradient(900px 360px at 100% 0%, #e0f2fe 0%, transparent 50%),
      var(--bg);
    color: var(--ink);
    font-family: "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 820px; margin: 0 auto; padding: 28px 18px 48px; }
  .sheet {
    background: var(--card);
    border: 1px solid rgba(24,24,27,.06);
    border-radius: 20px;
    box-shadow: 0 18px 50px rgba(24,24,27,.08);
    overflow: hidden;
  }
  .hero {
    padding: 28px 32px 22px;
    background: linear-gradient(135deg, #134e4a 0%, #0f766e 48%, #155e75 100%);
    color: #fff;
  }
  .hero .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 600; letter-spacing: .04em;
    text-transform: uppercase; opacity: .85; margin-bottom: 10px;
  }
  .hero h1 {
    margin: 0 0 10px; font-size: 26px; line-height: 1.25; font-weight: 700; letter-spacing: -.02em;
  }
  .hero .meta { margin: 0; font-size: 12.5px; opacity: .88; }
  .content { padding: 8px 32px 32px; }
  .content > .body-detail h1 { font-size: 22px; margin: 24px 0 10px; letter-spacing: -.02em; }
  .content > .body-detail h2 {
    font-size: 16px; margin: 28px 0 10px; padding-bottom: 8px;
    border-bottom: 1px solid var(--line); color: #134e4a;
  }
  .content > .body-detail h3 { font-size: 14px; margin: 20px 0 8px; color: #3f3f46; }
  .content > .body-detail h4 { font-size: 13px; margin: 16px 0 6px; color: #52525b; }
  .content > .body-detail p { margin: 0 0 12px; font-size: 14px; color: #27272a; }
  .content > .body-detail ul, .content > .body-detail ol { margin: 0 0 14px; padding-left: 1.25em; }
  .content > .body-detail li { margin: 0 0 6px; font-size: 14px; color: #27272a; }
  .content > .body-detail li::marker { color: var(--accent); }
  .content > .body-detail strong { color: #134e4a; font-weight: 700; }
  .content > .body-detail em { color: #3f3f46; }
  .content > .body-detail code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px; background: #f4f4f5; border: 1px solid var(--line);
    border-radius: 6px; padding: 1px 6px;
  }
  .content > .body-detail a { color: #0e7490; text-decoration: none; border-bottom: 1px solid rgba(14,116,144,.25); }
  .content > .body-detail blockquote {
    margin: 14px 0 18px; padding: 12px 16px;
    background: var(--accent-soft); border-left: 3px solid var(--accent);
    border-radius: 0 12px 12px 0; color: #115e59; font-size: 13px;
  }
  .content > .body-detail hr {
    border: 0; height: 1px; margin: 28px 0;
    background: linear-gradient(90deg, transparent, var(--line), transparent);
  }
  .content > .body-detail .md-table-wrap {
    margin: 14px 0 18px; overflow-x: auto; border-radius: 14px;
    border: 1px solid var(--line); background: #fff;
    box-shadow: 0 1px 0 rgba(24,24,27,.03);
  }
  .content > .body-detail table.md-table {
    width: 100%; border-collapse: collapse; min-width: 480px; font-size: 12.5px;
  }
  .content > .body-detail table.md-table th {
    text-align: left; padding: 10px 12px; background: #f0fdfa; color: #134e4a;
    font-weight: 700; border-bottom: 1px solid #99f6e4; white-space: nowrap;
  }
  .content > .body-detail table.md-table td {
    padding: 9px 12px; border-bottom: 1px solid #f4f4f5; color: #3f3f46;
    vertical-align: top; line-height: 1.5;
  }
  .content > .body-detail table.md-table tr:last-child td { border-bottom: 0; }
  .content > .body-detail table.md-table tbody tr:nth-child(even) td { background: #fafafa; }
  .footer {
    margin-top: 8px; padding-top: 16px; border-top: 1px dashed var(--line);
    font-size: 11px; color: var(--muted); display: flex; justify-content: space-between; gap: 12px;
  }
  ${ANALYSIS_REPORT_CSS}
  @media (max-width: 640px) {
    .hero, .content { padding-left: 20px; padding-right: 20px; }
    .hero h1 { font-size: 22px; }
  }
</style>
</head>
<body>
  <div class="page">
    <article class="sheet">
      <header class="hero">
        <div class="eyebrow">MSS Claw · 分析报告</div>
        <h1>${escapeAttr(meta.title)}</h1>
        <p class="meta">${escapeAttr(meta.agent)}${q ? ` · ${escapeAttr(q)}` : ''} · Markdown 智能分析 + 正文详稿</p>
      </header>
      <div class="content">
        ${meta.analysisHtml || ''}
        <div class="body-detail">
          ${bodyHtml}
        </div>
        <div class="footer">
          <span>智能分析看板 + Markdown 正文 · 指标与要点自动抽取</span>
          <span>${escapeAttr(new Date().toLocaleString('zh-CN'))}</span>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`;
}

function escapeAttr(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractDocTitle(markdown: string, fallback: string) {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m?.[1]?.trim() || fallback;
}

function buildHtmlFromMarkdown(
  markdown: string,
  ctx?: Pick<BuildDeliverablesContext, 'agentName' | 'query' | 'type'>,
  board?: AnalysisBoardData,
) {
  const fragment = markdownToHtmlFragment(markdown);
  // 去掉与 hero 重复的首个 h1，避免双标题
  const body = fragment.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/i, '');
  const title = extractDocTitle(
    markdown,
    ctx?.type === 'knowledge' ? '知识检索交付' : '任务交付报告',
  );
  const analysisHtml = buildAnalysisDashboardHtml(markdown, {
    type: ctx?.type,
    board: board ?? buildLocalAnalysisBoardData(markdown, { type: ctx?.type }),
  });
  return wrapReportHtml(body || fragment, {
    title,
    agent: ctx?.agentName || 'Agent',
    query: ctx?.query || '',
    analysisHtml,
  });
}

function buildPptFromMarkdown(
  markdown: string,
  ctx?: Pick<BuildDeliverablesContext, 'agentName' | 'query' | 'skills'>,
) {
  return buildPptDeckFromMarkdown(markdown, ctx);
}

/** 本地：由完整 Markdown 派生精美 HTML / PPT */
export function deriveDeliverableFromMarkdown(
  kind: GeneratableKind,
  markdown: string,
  ctx?: Pick<BuildDeliverablesContext, 'agentName' | 'query' | 'type' | 'skills'>,
): Pick<DeliverablePreview, 'html' | 'slides' | 'size' | 'pendingGenerate'> {
  if (kind === 'html') {
    const html = buildHtmlFromMarkdown(markdown, ctx);
    return {
      html,
      size: `${Math.max(6, Math.round(html.length / 1024))} KB`,
      pendingGenerate: false,
    };
  }

  const slides = buildPptFromMarkdown(markdown, ctx);
  return {
    slides,
    size: `${Math.max(0.6, slides.length * 0.35).toFixed(1)} MB`,
    pendingGenerate: false,
  };
}

export function hasDeliverableContent(item: DeliverablePreview): boolean {
  if (item.pendingGenerate) return false;
  if (item.kind === 'markdown') return Boolean(item.markdown?.trim());
  if (item.kind === 'html') return Boolean(item.html?.trim());
  if (item.kind === 'ppt') return Boolean(item.slides?.length);
  if (item.kind === 'xlsx') return Boolean(item.table);
  if (item.kind === 'board' || item.kind === 'knowledge') return true;
  return false;
}

export function isGeneratableKind(kind: DeliverableKind): kind is GeneratableKind {
  return kind === 'html' || kind === 'ppt';
}

/**
 * 基于 Markdown 生成 HTML / PPT
 * - HTML：模型提炼看板 JSON + 本地固定模板排版（观感不变、适配多场景）；无模型则纯本地
 * - PPT：可选用模型提炼幻灯片结构
 */
export async function generateDeliverableFromMarkdown(
  kind: GeneratableKind,
  markdown: string,
  ctx: BuildDeliverablesContext,
  signal?: AbortSignal,
): Promise<Pick<DeliverablePreview, 'html' | 'slides' | 'size' | 'pendingGenerate'>> {
  const source = markdown.trim();
  if (!source) {
    throw new Error('请先确保 Markdown 交付件有内容');
  }

  const local = deriveDeliverableFromMarkdown(kind, source, ctx);

  if (kind === 'html') {
    let board = buildLocalAnalysisBoardData(source, { type: ctx.type });
    if (isLlmConfigured()) {
      try {
        const modelBoard = await generateHtmlAnalysisBoardWithLlm({
          markdown: source,
          agentName: ctx.agentName,
          query: ctx.query,
          type: ctx.type,
          signal,
        });
        if (signal?.aborted) throw new Error('已取消生成');
        board = mergeAnalysisBoardData(board, modelBoard);
      } catch {
        // 模型失败：保留本地看板，观感与正文仍可用
      }
    } else {
      await new Promise((r) => setTimeout(r, 280));
    }
    if (signal?.aborted) throw new Error('已取消生成');
    const html = buildHtmlFromMarkdown(source, ctx, board);
    return {
      html,
      size: `${Math.max(6, Math.round(html.length / 1024))} KB`,
      pendingGenerate: false,
    };
  }

  if (isLlmConfigured()) {
    try {
      const llm = await generateDeliverableFormatWithLlm({
        kind: 'ppt',
        markdown: source,
        agentName: ctx.agentName,
        query: ctx.query,
        type: ctx.type,
        signal,
      });
      if (llm.slides?.length) {
        const localSlides = local.slides?.length ?? 0;
        if (llm.slides.length + 1 >= localSlides || llm.slides.length >= 4) {
          const slides = finalizePptDeck(
            llm.slides.map((s) => ({
              title: s.title,
              bullets: s.bullets,
              role: 'content' as const,
            })),
            {
              title: extractDocTitle(source, '业务汇报'),
              agentName: ctx.agentName,
              query: ctx.query,
              skills: ctx.skills,
            },
          );
          return {
            slides,
            size: `${Math.max(0.6, slides.length * 0.35).toFixed(1)} MB`,
            pendingGenerate: false,
          };
        }
      }
    } catch {
      // 回落本地
    }
  }

  await new Promise((r) => setTimeout(r, 280));
  if (signal?.aborted) throw new Error('已取消生成');
  return local;
}

function emptyFormatStub(
  id: string,
  kind: GeneratableKind,
  name: string,
  title: string,
  icon: string,
  iconClass: string,
): DeliverablePreview {
  return {
    id,
    kind,
    name,
    title,
    size: '待生成',
    icon,
    iconClass,
    pendingGenerate: true,
  };
}

/** 构建与当前任务上下文匹配的可预览交付件（默认仅 Markdown 有内容） */
export function buildDeliverablePreviews(ctx: BuildDeliverablesContext): DeliverablePreview[] {
  const md = ctx.type === 'marketing' ? marketingMarkdown(ctx) : knowledgeMarkdown(ctx);
  const prefix = ctx.type === 'marketing' ? 'm' : 'k';

  return [
    {
      id: `${prefix}-md`,
      kind: 'markdown',
      name: 'Markdown',
      title: 'Markdown',
      size: `${Math.max(2, Math.round(md.length / 1024))} KB`,
      icon: 'fa-file-lines',
      iconClass: 'text-zinc-700',
      markdown: md,
      pendingGenerate: false,
    },
    emptyFormatStub(`${prefix}-html`, 'html', 'HTML', 'HTML', 'fa-file-code', 'text-orange-600'),
    emptyFormatStub(`${prefix}-ppt`, 'ppt', 'PPT', 'PPT', 'fa-file-powerpoint', 'text-amber-600'),
  ];
}

export function downloadDeliverable(item: DeliverablePreview, query = '') {
  if (item.kind === 'markdown' && item.markdown) {
    downloadBlob(`${item.name}.md`, item.markdown, 'text/markdown;charset=utf-8');
    return;
  }
  if (item.kind === 'html' && item.html) {
    downloadBlob(`${item.name}.html`, item.html, 'text/html;charset=utf-8');
    return;
  }
  if (item.kind === 'ppt' && item.slides?.length) {
    // 导出真实 .pptx（此前用 .md 大纲凑合，和 HTML 扩展名不一致）
    downloadPptx(item.name, item.slides);
    return;
  }
  if (item.kind === 'xlsx' && item.table) {
    const csv = [item.table.headers.join(','), ...item.table.rows.map((r) => r.join(','))].join('\n');
    downloadBlob(`${item.name}.csv`, `${csv}\n# ${query}`, 'text/csv;charset=utf-8');
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
