import { extractBullets, parseMarkdownSections } from '@/domain/markdownRender';

export interface ReportMetric {
  label: string;
  value: string;
  tone: 'up' | 'down' | 'neutral' | 'warn';
  hint?: string;
}

export interface ReportInsight {
  title: string;
  text: string;
  kind: 'finding' | 'risk' | 'action' | 'cite';
}

/** 分析看板结构化数据：可由本地规则或模型填充，再套同一套 HTML 模板 */
export interface AnalysisBoardData {
  executiveSummary: string;
  metrics: ReportMetric[];
  insights: ReportInsight[];
  risks: string[];
  actions: string[];
  cites: string[];
  sectionOverview: { title: string; pointCount: number }[];
  source: 'local' | 'model';
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plain(s: string) {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** 从 Markdown 抽取百分比/数值指标，用于 KPI 与简易柱状图 */
export function extractReportMetrics(markdown: string): ReportMetric[] {
  const metrics: ReportMetric[] = [];
  const seen = new Set<string>();
  // 先去加粗/斜体标记，避免 **+8.2%** 抽不到
  const text = markdown
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  const pushMetric = (labelRaw: string, numStr: string, hint?: string) => {
    const label = plain(labelRaw).replace(/[-*·:：]+$/g, '').trim() || '指标';
    const num = Number(numStr);
    const value = `${numStr}%`;
    const key = `${label}|${value}`;
    if (seen.has(key) || metrics.length >= 6) return;
    seen.add(key);
    metrics.push({
      label: label.slice(0, 18),
      value,
      tone: num > 0 ? 'up' : num < 0 ? 'down' : 'neutral',
      hint,
    });
  };

  const pctRe =
    /([A-Za-z\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff/\s]{0,20}?)\s*[:：]?\s*([+-]?\d+(?:\.\d+)?)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = pctRe.exec(text)) && metrics.length < 6) {
    pushMetric(m[1]!, m[2]!, '来自 Markdown 数值');
  }

  const inlinePct = /(环比|同比|增长|下降|转化|占比|提升|回落)\s*([+-]?\d+(?:\.\d+)?)\s*%/g;
  while ((m = inlinePct.exec(text)) && metrics.length < 6) {
    pushMetric(m[1]!, m[2]!);
  }

  const rankRe = /([A-Za-z\u4e00-\u9fff]{2,12}).{0,8}(?:排名|第)\s*(\d{1,2})\b/g;
  while ((m = rankRe.exec(text)) && metrics.length < 6) {
    const label = `${plain(m[1]!).slice(0, 10)}排名`;
    const value = `#${m[2]}`;
    const key = `${label}|${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    metrics.push({ label, value, tone: 'neutral', hint: '位次' });
  }

  return metrics.slice(0, 4);
}

/** 从章节提炼洞察 / 风险 / 行动 / 引用 */
export function extractReportInsights(markdown: string): ReportInsight[] {
  const sections = parseMarkdownSections(markdown);
  const insights: ReportInsight[] = [];
  const allBullets = extractBullets(markdown, 24);

  const pushUnique = (item: ReportInsight) => {
    if (insights.some((x) => x.text === item.text)) return;
    insights.push(item);
  };

  for (const b of allBullets) {
    const t = plain(b);
    if (t.length < 8) continue;
    if (/风险|合规|避免|警告|需复核|不得|禁止/.test(t)) {
      pushUnique({ title: '风险提示', text: t, kind: 'risk' });
    } else if (/建议|下一步|启动|同步|复核|提交|执行/.test(t)) {
      pushUnique({ title: '行动建议', text: t, kind: 'action' });
    } else if (/引用|来源|指南|规范|SOP|文档/.test(t) && insights.filter((i) => i.kind === 'cite').length < 2) {
      pushUnique({ title: '溯源引用', text: t, kind: 'cite' });
    } else if (insights.filter((i) => i.kind === 'finding').length < 4) {
      pushUnique({ title: '关键发现', text: t, kind: 'finding' });
    }
    if (insights.length >= 8) break;
  }

  // 按章节补齐：结论 / 下一步 / 引用
  for (const sec of sections) {
    const h = sec.heading;
    const bullets = extractBullets(sec.body, 4);
    if (!bullets.length) continue;
    if (/结论|摘要|发现|洞察/.test(h)) {
      for (const b of bullets.slice(0, 2)) {
        pushUnique({ title: h, text: plain(b), kind: 'finding' });
      }
    }
    if (/下一步|建议|行动/.test(h)) {
      for (const b of bullets.slice(0, 3)) {
        pushUnique({ title: h, text: plain(b), kind: 'action' });
      }
    }
    if (/引用|来源|溯源/.test(h)) {
      for (const b of bullets.slice(0, 2)) {
        pushUnique({ title: h, text: plain(b), kind: 'cite' });
      }
    }
  }

  return insights.slice(0, 8);
}

function toneClass(tone: ReportMetric['tone']) {
  if (tone === 'up') return 'kpi-up';
  if (tone === 'down') return 'kpi-down';
  if (tone === 'warn') return 'kpi-warn';
  return 'kpi-neutral';
}

function kindMeta(kind: ReportInsight['kind']) {
  if (kind === 'risk') return { label: '风险', cls: 'tag-risk' };
  if (kind === 'action') return { label: '行动', cls: 'tag-action' };
  if (kind === 'cite') return { label: '溯源', cls: 'tag-cite' };
  return { label: '发现', cls: 'tag-find' };
}

function pctWidth(value: string): number {
  const n = Math.abs(Number(String(value).replace('%', '')));
  if (!Number.isFinite(n)) return 40;
  return Math.max(12, Math.min(100, n * (n <= 20 ? 4 : 1)));
}

/** 本地规则：从 Markdown 抽取分析看板数据（模型失败时的保底） */
export function buildLocalAnalysisBoardData(
  markdown: string,
  opts?: { type?: 'marketing' | 'knowledge' },
): AnalysisBoardData {
  const metrics = extractReportMetrics(markdown);
  const insights = extractReportInsights(markdown);
  const sections = parseMarkdownSections(markdown);
  const findings = insights.filter((i) => i.kind === 'finding');
  const risks = insights.filter((i) => i.kind === 'risk').map((i) => i.text);
  const actions = insights.filter((i) => i.kind === 'action').map((i) => i.text);
  const cites = insights.filter((i) => i.kind === 'cite').map((i) => i.text);

  const structural: ReportMetric[] =
    metrics.length > 0
      ? metrics
      : [
          {
            label: '章节覆盖',
            value: String(Math.max(1, sections.length)),
            tone: 'neutral',
            hint: 'Markdown 章节',
          },
          {
            label: '提炼要点',
            value: String(Math.max(1, insights.length)),
            tone: 'up',
            hint: '自动抽取',
          },
          {
            label: '报告类型',
            value: opts?.type === 'knowledge' ? '知识' : '分析',
            tone: 'neutral',
          },
        ];

  const executiveSummary =
    plain((findings[0] || insights[0])?.text || extractBullets(markdown, 1)[0] || '') ||
    '已根据 Markdown 完成结构化分析，详见下方看板与正文。';

  return {
    executiveSummary: executiveSummary.slice(0, 160),
    metrics: structural.slice(0, 4),
    insights: (findings.length ? findings : insights).slice(0, 4),
    risks: risks.slice(0, 4),
    actions: actions.slice(0, 4),
    cites: cites.slice(0, 3),
    sectionOverview: sections.slice(0, 6).map((s) => ({
      title: s.heading,
      pointCount: extractBullets(s.body, 20).length,
    })),
    source: 'local',
  };
}

/** 规范化模型返回的看板数据，并与本地结果合并补缺 */
export function mergeAnalysisBoardData(
  local: AnalysisBoardData,
  model: Partial<AnalysisBoardData> | null | undefined,
): AnalysisBoardData {
  if (!model) return local;
  const toneOk = (t: unknown): t is ReportMetric['tone'] =>
    t === 'up' || t === 'down' || t === 'neutral' || t === 'warn';

  const metrics = (model.metrics || [])
    .map((m) => ({
      label: String(m?.label || '').trim().slice(0, 18),
      value: String(m?.value || '').trim().slice(0, 24),
      tone: toneOk(m?.tone) ? m.tone : 'neutral',
      hint: m?.hint ? String(m.hint).slice(0, 24) : '模型提炼',
    }))
    .filter((m) => m.label && m.value);

  const insights = (model.insights || [])
    .map((i) => ({
      title: String(i?.title || '关键发现').trim().slice(0, 40),
      text: String(i?.text || '').trim().slice(0, 200),
      kind:
        i?.kind === 'risk' || i?.kind === 'action' || i?.kind === 'cite' || i?.kind === 'finding'
          ? i.kind
          : ('finding' as const),
    }))
    .filter((i) => i.text);

  const risks = (model.risks || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
  const actions = (model.actions || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
  const cites = (model.cites || []).map((x) => String(x).trim()).filter(Boolean).slice(0, 3);
  const sectionOverview = (model.sectionOverview || [])
    .map((s) => ({
      title: String(s?.title || '').trim(),
      pointCount: Number(s?.pointCount) || 0,
    }))
    .filter((s) => s.title)
    .slice(0, 6);

  const executiveSummary = String(model.executiveSummary || '').trim().slice(0, 160);

  // 模型结果过稀时回落本地，保证看板观感不塌
  const richEnough =
    Boolean(executiveSummary) &&
    (metrics.length >= 2 || insights.length >= 2 || actions.length + risks.length >= 2);

  if (!richEnough) return local;

  return {
    executiveSummary: executiveSummary || local.executiveSummary,
    metrics: metrics.length ? metrics.slice(0, 4) : local.metrics,
    insights: insights.length ? insights.slice(0, 4) : local.insights,
    risks: risks.length ? risks : local.risks,
    actions: actions.length ? actions : local.actions,
    cites: cites.length ? cites : local.cites,
    sectionOverview: sectionOverview.length ? sectionOverview : local.sectionOverview,
    source: 'model',
  };
}

/** 基于结构化数据生成分析报告看板 HTML（插在正文前）——模板固定，内容可来自模型 */
export function buildAnalysisDashboardHtml(
  markdown: string,
  opts?: { type?: 'marketing' | 'knowledge'; board?: AnalysisBoardData },
) {
  const board = opts?.board ?? buildLocalAnalysisBoardData(markdown, opts);
  const findings = board.insights.filter((i) => i.kind === 'finding').slice(0, 3);
  const structural = board.metrics.slice(0, 4);
  const chartMetrics = structural.filter((m) => /%|％/.test(m.value)).slice(0, 4);
  const sourceHint = board.source === 'model' ? '模型按场景提炼 · 本地模板排版' : '本地规则抽取 · 模板排版';

  const kpiCards = structural
    .map(
      (m) => `<div class="kpi ${toneClass(m.tone)}">
      <div class="kpi-label">${esc(m.label)}</div>
      <div class="kpi-value">${esc(m.value)}</div>
      ${m.hint ? `<div class="kpi-hint">${esc(m.hint)}</div>` : ''}
    </div>`,
    )
    .join('');

  const chartBlock =
    chartMetrics.length >= 2
      ? `<div class="panel">
      <div class="panel-hd"><span>指标对照</span><span class="muted">${board.source === 'model' ? '模型提炼数值' : '由文中百分比生成'}</span></div>
      <div class="bars">
        ${chartMetrics
          .map(
            (m) => `<div class="bar-row">
          <div class="bar-label">${esc(m.label)}</div>
          <div class="bar-track"><div class="bar-fill ${toneClass(m.tone)}" style="width:${pctWidth(m.value)}%"></div></div>
          <div class="bar-val">${esc(m.value)}</div>
        </div>`,
          )
          .join('')}
      </div>
    </div>`
      : `<div class="panel">
      <div class="panel-hd"><span>结构概览</span><span class="muted">章节拆解</span></div>
      <div class="struct-grid">
        ${board.sectionOverview
          .slice(0, 6)
          .map(
            (s, i) => `<div class="struct-item">
          <span class="struct-idx">${i + 1}</span>
          <span class="struct-title">${esc(s.title)}</span>
          <span class="struct-len">${s.pointCount} 要点</span>
        </div>`,
          )
          .join('')}
      </div>
    </div>`;

  const insightCards = (findings.length ? findings : board.insights.slice(0, 3))
    .map((ins) => {
      const meta = kindMeta(ins.kind);
      return `<div class="insight-card">
        <span class="tag ${meta.cls}">${meta.label}</span>
        <h4>${esc(ins.title)}</h4>
        <p>${esc(ins.text)}</p>
      </div>`;
    })
    .join('');

  const riskList =
    board.risks.length > 0
      ? board.risks.map((r) => `<li>${esc(r)}</li>`).join('')
      : '<li>文中未检出显式风险词；请结合正文复核业务口径。</li>';

  const actionList =
    board.actions.length > 0
      ? board.actions.map((a, i) => `<li><span class="step">${i + 1}</span>${esc(a)}</li>`).join('')
      : '<li><span class="step">1</span>复核正文结论后同步相关 Owner。</li>';

  const citeBlock =
    board.cites.length > 0
      ? `<div class="panel cite-panel">
      <div class="panel-hd"><span>溯源要点</span><span class="muted">${board.source === 'model' ? '模型归纳' : '来自引用相关语句'}</span></div>
      <ul class="cite-list">${board.cites.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </div>`
      : '';

  return `
<section class="analysis">
  <div class="analysis-hd">
    <div>
      <p class="analysis-eyebrow">ANALYSIS BOARD</p>
      <h2>智能分析看板</h2>
      <p class="analysis-desc">${esc(sourceHint)}：指标、发现、风险与行动，便于多场景快速阅览。</p>
    </div>
    <div class="exec-pill">
      <span class="exec-label">一句话摘要</span>
      <p>${esc(plain(board.executiveSummary).slice(0, 160))}</p>
    </div>
  </div>

  <div class="kpi-grid">${kpiCards}</div>

  <div class="split">
    ${chartBlock}
    <div class="panel">
      <div class="panel-hd"><span>关键发现</span><span class="muted">${board.source === 'model' ? '模型聚类' : '自动聚类'}</span></div>
      <div class="insight-grid">${insightCards || '<p class="muted">暂无提炼要点</p>'}</div>
    </div>
  </div>

  <div class="split split-2">
    <div class="panel panel-risk">
      <div class="panel-hd"><span>风险与注意</span></div>
      <ul class="bullet-rich">${riskList}</ul>
    </div>
    <div class="panel panel-action">
      <div class="panel-hd"><span>行动路线</span></div>
      <ul class="action-list">${actionList}</ul>
    </div>
  </div>

  ${citeBlock}
</section>
<section class="body-hd">
  <p class="analysis-eyebrow">FULL REPORT</p>
  <h2>正文详情</h2>
  <p class="analysis-desc">完整保留 Markdown 原文结构与表述，供核对与转发。</p>
</section>`;
}

/** 分析看板专用样式（注入到报告 <style>） */
export const ANALYSIS_REPORT_CSS = `
  .analysis { margin: 22px 0 8px; }
  .analysis-hd, .body-hd { margin: 8px 0 14px; }
  .analysis-eyebrow {
    margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: .14em;
    color: #0f766e; text-transform: uppercase;
  }
  .analysis h2, .body-hd h2 {
    margin: 0 0 6px; font-size: 18px; color: #134e4a; letter-spacing: -.02em;
    border: 0; padding: 0;
  }
  .analysis-desc { margin: 0; font-size: 12.5px; color: #71717a; }
  .exec-pill {
    margin-top: 12px; padding: 12px 14px; border-radius: 14px;
    background: linear-gradient(135deg, #f0fdfa, #ecfeff);
    border: 1px solid #99f6e4;
  }
  .exec-label {
    display: inline-block; font-size: 10px; font-weight: 700; color: #0f766e;
    letter-spacing: .08em; text-transform: uppercase; margin-bottom: 4px;
  }
  .exec-pill p { margin: 0; font-size: 13.5px; color: #115e59; line-height: 1.55; font-weight: 600; }
  .kpi-grid {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 16px 0;
  }
  .kpi {
    border-radius: 14px; padding: 12px 12px 10px; background: #fafafa;
    border: 1px solid #e4e4e7; min-height: 88px;
  }
  .kpi-up { background: #f0fdfa; border-color: #99f6e4; }
  .kpi-down { background: #fff1f2; border-color: #fecdd3; }
  .kpi-warn { background: #fffbeb; border-color: #fde68a; }
  .kpi-neutral { background: #f8fafc; border-color: #e2e8f0; }
  .kpi-label { font-size: 11px; color: #71717a; font-weight: 600; }
  .kpi-value { margin-top: 6px; font-size: 22px; font-weight: 700; letter-spacing: -.03em; color: #18181b; }
  .kpi-up .kpi-value { color: #0f766e; }
  .kpi-down .kpi-value { color: #e11d48; }
  .kpi-hint { margin-top: 4px; font-size: 10px; color: #a1a1aa; }
  .split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 12px; margin: 12px 0; }
  .split-2 { grid-template-columns: 1fr 1fr; }
  .panel {
    border: 1px solid #e4e4e7; border-radius: 16px; padding: 14px 14px 12px; background: #fff;
  }
  .panel-hd {
    display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
    margin-bottom: 12px; font-size: 13px; font-weight: 700; color: #18181b;
  }
  .panel-hd .muted, .muted { font-size: 11px; color: #a1a1aa; font-weight: 500; }
  .bars { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: grid; grid-template-columns: 72px 1fr 48px; gap: 8px; align-items: center; }
  .bar-label { font-size: 11px; color: #52525b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar-track { height: 8px; border-radius: 999px; background: #f4f4f5; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; background: #0f766e; }
  .bar-fill.kpi-down { background: #e11d48; }
  .bar-fill.kpi-up { background: #0d9488; }
  .bar-val { font-size: 11px; font-weight: 700; color: #3f3f46; text-align: right; }
  .struct-grid { display: flex; flex-direction: column; gap: 8px; }
  .struct-item {
    display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center;
    padding: 8px 10px; border-radius: 10px; background: #fafafa; border: 1px solid #f4f4f5;
  }
  .struct-idx {
    width: 22px; height: 22px; border-radius: 7px; background: #134e4a; color: #fff;
    font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  }
  .struct-title { font-size: 12.5px; font-weight: 600; color: #27272a; }
  .struct-len { font-size: 10px; color: #a1a1aa; }
  .insight-grid { display: flex; flex-direction: column; gap: 8px; }
  .insight-card {
    border-radius: 12px; padding: 10px 12px; background: #fafafa; border: 1px solid #f4f4f5;
  }
  .insight-card h4 { margin: 6px 0 4px; font-size: 12.5px; color: #18181b; }
  .insight-card p { margin: 0; font-size: 12px; color: #3f3f46; line-height: 1.55; }
  .tag {
    display: inline-block; font-size: 10px; font-weight: 700; border-radius: 999px;
    padding: 2px 7px; letter-spacing: .02em;
  }
  .tag-find { background: #ecfeff; color: #0e7490; }
  .tag-risk { background: #fff1f2; color: #be123c; }
  .tag-action { background: #f0fdfa; color: #0f766e; }
  .tag-cite { background: #f4f4f5; color: #52525b; }
  .panel-risk { background: linear-gradient(180deg, #fff1f2 0%, #fff 48%); }
  .panel-action { background: linear-gradient(180deg, #f0fdfa 0%, #fff 48%); }
  .bullet-rich, .action-list, .cite-list { margin: 0; padding-left: 0; list-style: none; }
  .bullet-rich li, .cite-list li {
    position: relative; padding: 7px 0 7px 14px; font-size: 12.5px; color: #3f3f46; line-height: 1.55;
    border-bottom: 1px dashed #f4f4f5;
  }
  .bullet-rich li:last-child, .cite-list li:last-child, .action-list li:last-child { border-bottom: 0; }
  .bullet-rich li::before {
    content: ""; position: absolute; left: 0; top: 14px; width: 6px; height: 6px; border-radius: 50%;
    background: #e11d48;
  }
  .action-list li {
    display: flex; gap: 8px; align-items: flex-start; padding: 8px 0;
    font-size: 12.5px; color: #3f3f46; line-height: 1.55; border-bottom: 1px dashed #e7e5e4;
  }
  .action-list .step {
    flex-shrink: 0; width: 18px; height: 18px; border-radius: 6px; background: #0f766e; color: #fff;
    font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px;
  }
  .cite-panel { margin-top: 12px; }
  @media (max-width: 720px) {
    .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .split, .split-2 { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 64px 1fr 40px; }
  }
`;
