import { Injectable } from '@nestjs/common';
import type { AgentType, ExecutionStep, StreamEvent, StreamExecutionDto } from './dto/stream-execution.dto';

const MARKETING_STEPS: ExecutionStep[] = [
  { skill: 'Intent_Parser', time: '120ms', label: '多模态意图识别', detail: '解析群聊上下文，提取实体与 Action。' },
  { skill: 'SQL_Generator', time: '850ms', label: '自动路由与取数', detail: '通过 OData 并发拉取 SAP 与 Salesforce 明细。' },
  { skill: 'Data_Sanitizer', time: '45ms', label: '隐私合规脱敏', detail: '触发 GDPR 数据护栏，屏蔽 PII。' },
  { skill: 'Python_Sandbox', time: '2.1s', label: '执行归因算法容器', detail: 'SHAPAnalyzer 输出特征权重。' },
  { skill: 'Report_Renderer', time: '350ms', label: '大屏与策略生成', detail: '渲染看板并生成 NBA 策略。' },
];

const KNOWLEDGE_STEPS: ExecutionStep[] = [
  { skill: 'Query_Rewriter', time: '180ms', label: '提问重写与对齐', detail: '映射口语到 3C 规范术语。' },
  { skill: 'Vector_Search', time: '420ms', label: 'Milvus 高维检索', detail: 'Top-K 召回 15 个文档块。' },
  { skill: 'Cross_Encoder', time: '360ms', label: 'Rerank 语义重排', detail: '保留 Top-3 核心参考源。' },
  { skill: 'Knowledge_Synthesizer', time: '820ms', label: '抗幻觉摘要生成', detail: '注入溯源锚点并生成回答。' },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveAgentType(chatId: string, message: string): AgentType {
  const marketingChats = new Set(['marketing', 'group_q3', 'campaign_ops', 'insight_agent']);
  if (marketingChats.has(chatId)) return 'marketing';
  if (message.includes('@知识') || message.includes('合规') || message.includes('RAG')) return 'knowledge';
  return chatId === 'knowledge' || chatId === 'rd_rag' ? 'knowledge' : 'marketing';
}

function buildReplyTokens(agentType: AgentType, query: string) {
  const previewHint =
    agentType === 'marketing'
      ? '点击查看右侧沙盒生成的交互看板及 NBA 策略'
      : '阅读右侧结构化解答及文献溯源卡片';
  const colorClass = agentType === 'marketing' ? 'text-indigo-600' : 'text-emerald-600';
  const snippet = query.length > 15 ? `${query.slice(0, 15)}...` : query;
  const plain = `✅ **任务完成。** 针对需求 *"${snippet}"*，Agent 已完成处理。\n\n👉 ${previewHint}。`;
  return plain.replace(previewHint, `<span class="${colorClass} font-bold">${previewHint}</span>`);
}

function getAgentName(chatId: string, agentType: AgentType) {
  const byChat: Record<string, string> = {
    marketing: '营销 Agent',
    knowledge: '知识 Agent',
    insight_agent: '洞察 Agent',
    rd_rag: '研发 RAG Agent',
  };
  return byChat[chatId] ?? (agentType === 'marketing' ? '营销 Agent' : '知识 Agent');
}

@Injectable()
export class ExecutionsService {
  async *createStream(params: StreamExecutionDto, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    if (signal?.aborted) return;

    const agentType = resolveAgentType(params.chatId, params.message);
    const steps = agentType === 'marketing' ? MARKETING_STEPS : KNOWLEDGE_STEPS;
    const executionId = `exec_${Date.now()}`;

    yield { type: 'execution_start', executionId };

    for (const step of steps) {
      if (signal?.aborted) return;
      yield { type: 'skill_start', skill: step.skill, label: step.label };
      await sleep(step.skill === 'Python_Sandbox' ? 480 : 220);
      if (signal?.aborted) return;
      yield { type: 'skill_end', skill: step.skill, latency: step.time };
    }

    const html = buildReplyTokens(agentType, params.message);
    const tokens = html.match(/(\*\*[^*]+\*\*|\*[^*]+\*|<span[^>]*>.*?<\/span>|[^\s]+|\s+)/g) ?? [html];
    for (const token of tokens) {
      if (signal?.aborted) return;
      yield { type: 'token', content: token };
      await sleep(28 + Math.floor(Math.random() * 22));
    }

    yield { type: 'artifact', agentType };
    yield {
      type: 'done',
      totalTime: agentType === 'marketing' ? '4.28s' : '1.84s',
      steps,
      agentName: getAgentName(params.chatId, agentType),
      followUp:
        params.chatId === 'group_q3'
          ? {
              role: 'other',
              name: 'Jacky (拉美地总)',
              avatar: 'bg-pink-500',
              text: '看到了，友商A降价影响这么大。产品这边确认下沙盒里生成的NBA补贴券策略可行吗？可行我们下午拉会定。',
            }
          : undefined,
    };
  }
}
