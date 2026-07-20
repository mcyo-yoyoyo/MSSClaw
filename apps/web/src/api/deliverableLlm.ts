import { getActiveLlmConfig, isLlmConfigured } from '@/api/llmClient';
import { normalizeLlmModelId } from '@/domain/llmConfig';
import type { AnalysisBoardData, ReportInsight, ReportMetric } from '@/domain/htmlReportAnalysis';

export type DeliverableLlmKind = 'html' | 'ppt';

export interface LlmDeliverableResult {
  html?: string;
  slides?: { title: string; bullets: string[] }[];
  analysisBoard?: Partial<AnalysisBoardData>;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/$/, '');
}

async function chatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { maxTokens?: number; temperature?: number; signal?: AbortSignal },
): Promise<string> {
  const config = getActiveLlmConfig();
  const res = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: normalizeLlmModelId(config.model),
      messages,
      max_tokens: options?.maxTokens ?? 3200,
      temperature: options?.temperature ?? 0.4,
      stream: false,
    }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 160)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

function stripCodeFence(raw: string) {
  let text = raw.trim();
  // 去掉首尾 ```html / ```json 等围栏（含模型偶尔加的语言标签）
  text = text.replace(/^```(?:html|HTML|json|JSON|xml)?\s*\n?/i, '');
  text = text.replace(/\n?```\s*$/i, '');
  return text.trim();
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const text = stripCodeFence(raw);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** 模型只产出分析看板 JSON；HTML 外壳仍由本地模板渲染（保观感、适多场景） */
export async function generateHtmlAnalysisBoardWithLlm(params: {
  markdown: string;
  agentName?: string;
  query?: string;
  type?: 'marketing' | 'knowledge';
  signal?: AbortSignal;
}): Promise<Partial<AnalysisBoardData>> {
  if (!isLlmConfigured()) {
    throw new Error('LLM 未配置');
  }

  const md = params.markdown.slice(0, 12000);
  const scenario =
    params.type === 'knowledge'
      ? '知识检索 / 合规 / SOP / 引用溯源'
      : '营销数据 / 经营分析 / 渠道与代表处';

  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content: [
          '你是企业多场景分析报告架构师。根据 Markdown 提炼「分析看板」结构化 JSON，供前端固定模板渲染。',
          '只返回 JSON，不要代码块，不要解释。字段：',
          '{',
          '  "executiveSummary": "一句话摘要（≤80字）",',
          '  "metrics": [{"label":"指标名","value":"如 +8.2% 或 #1","tone":"up|down|neutral|warn","hint":"可选"}],',
          '  "insights": [{"title":"短标题","text":"发现陈述","kind":"finding|risk|action|cite"}],',
          '  "risks": ["风险句"],',
          '  "actions": ["行动句"],',
          '  "cites": ["溯源/引用句"],',
          '  "sectionOverview": [{"title":"章节名","pointCount":3}]',
          '}',
          '要求：',
          '1) 紧扣场景语义提炼，适配营销/知识/培训/电商等不同材料，不要套固定话术。',
          '2) 不得编造原文没有的数字或事实；可归纳改写，但必须可追溯到 Markdown。',
          '3) metrics 2-4 个；insights 2-4 个；risks/actions 各 1-4 条；尽量保留关键百分比与专有名词。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          `场景倾向：${scenario}`,
          `Agent：${params.agentName || 'Agent'}`,
          `任务：${params.query || '（未填）'}`,
          '',
          'Markdown 全文：',
          md,
        ].join('\n'),
      },
    ],
    { maxTokens: 2200, temperature: 0.35, signal: params.signal },
  );

  const obj = parseJsonObject(raw);
  if (!obj) throw new Error('LLM 未返回有效分析看板 JSON');

  const metrics = (Array.isArray(obj.metrics) ? obj.metrics : []) as ReportMetric[];
  const insights = (Array.isArray(obj.insights) ? obj.insights : []) as ReportInsight[];

  return {
    executiveSummary: typeof obj.executiveSummary === 'string' ? obj.executiveSummary : undefined,
    metrics,
    insights,
    risks: Array.isArray(obj.risks) ? obj.risks.map(String) : undefined,
    actions: Array.isArray(obj.actions) ? obj.actions.map(String) : undefined,
    cites: Array.isArray(obj.cites) ? obj.cites.map(String) : undefined,
    sectionOverview: Array.isArray(obj.sectionOverview)
      ? (obj.sectionOverview as AnalysisBoardData['sectionOverview'])
      : undefined,
    source: 'model',
  };
}

/** 基于完整 Markdown + LLM 生成 HTML 看板数据 / PPT */
export async function generateDeliverableFormatWithLlm(params: {
  kind: DeliverableLlmKind;
  markdown: string;
  agentName?: string;
  query?: string;
  type?: 'marketing' | 'knowledge';
  signal?: AbortSignal;
}): Promise<LlmDeliverableResult> {
  if (!isLlmConfigured()) {
    throw new Error('LLM 未配置');
  }

  // 尽量喂满原文，减少「内容没用上」
  const md = params.markdown.slice(0, 14000);
  const meta = [
    `Agent：${params.agentName || 'Agent'}`,
    `任务：${params.query || '（未填）'}`,
  ].join('\n');

  if (params.kind === 'html') {
    const analysisBoard = await generateHtmlAnalysisBoardWithLlm({
      markdown: params.markdown,
      agentName: params.agentName,
      query: params.query,
      type: params.type,
      signal: params.signal,
    });
    return { analysisBoard };
  }

  const raw = await chatCompletion(
    [
      {
        role: 'system',
        content: [
          '你是企业高管汇报 PPT 结构专家。根据 Markdown 提炼幻灯片。',
          '硬性要求：',
          '1) 覆盖原文全部主要章节与关键结论/数据/建议，不得只摘前两段。',
          '2) 只返回 JSON：{"slides":[{"title":"...","bullets":["..."]}]}，不要代码块，不要解释。',
          '3) 建议 4-10 页：第 1 页封面（标题+背景），其后每章一页或合并极短章节；每页 3-7 条 bullets，bullet 用完整业务语句，保留关键数字。',
          '4) 不要空泛套话；bullet 必须能追溯到原文信息。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `${meta}\n\nMarkdown 全文：\n${md}`,
      },
    ],
    { maxTokens: 2800, temperature: 0.3, signal: params.signal },
  );
  const obj = parseJsonObject(raw);
  const slides = obj?.slides as { title?: string; bullets?: string[] }[] | undefined;
  if (!Array.isArray(slides) || !slides.length) throw new Error('LLM 未返回有效 PPT');
  return {
    slides: slides.slice(0, 12).map((s) => ({
      title: String(s.title || '要点'),
      bullets: Array.isArray(s.bullets)
        ? s.bullets.map((b) => String(b)).filter(Boolean).slice(0, 10)
        : ['（无要点）'],
    })),
  };
}
