import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AGENT_CATALOG,
  KNOWLEDGE_CATALOG,
  MEMORY_CATALOG,
  PROMPT_CATALOG,
  SKILL_CATALOG,
  TOOL_CATALOG,
  WORKFLOW_CATALOG,
} from '../data/center-catalogs';
import { PrismaService } from '../prisma/prisma.service';
import {
  getNextAgentStatus,
  getNextPromptLifecycle,
  getNextSkillLifecycle,
  getNextWorkflowStatus,
  type CenterKind,
} from './center-lifecycle';

const LOCAL_CATALOGS: Record<CenterKind, Record<string, Record<string, unknown>[]>> = {
  prompt: PROMPT_CATALOG,
  agent: AGENT_CATALOG,
  skill: SKILL_CATALOG,
  workflow: WORKFLOW_CATALOG,
  knowledge: KNOWLEDGE_CATALOG,
  tool: TOOL_CATALOG,
  memory: MEMORY_CATALOG,
};

@Injectable()
export class CenterRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, kind: CenterKind) {
    const rows = await this.prisma.centerRecord.findMany({
      where: { workspaceId, kind },
      orderBy: { updatedAt: 'desc' },
    });

    if (rows.length === 0) {
      return LOCAL_CATALOGS[kind][workspaceId] ?? [];
    }

    return rows.map((row: { payload: unknown }) => row.payload as Record<string, unknown>);
  }

  async findOne(workspaceId: string, kind: CenterKind, id: string) {
    const row = await this.prisma.centerRecord.findFirst({
      where: { id, workspaceId, kind },
    });

    if (row) return row.payload as Record<string, unknown>;

    const local = (LOCAL_CATALOGS[kind][workspaceId] ?? []).find((item) => item.id === id);
    if (!local) throw new NotFoundException(`${kind} ${id} not found`);
    return local;
  }

  async updatePayload(
    workspaceId: string,
    kind: CenterKind,
    id: string,
    patch: Record<string, unknown>,
  ) {
    const current = await this.findOne(workspaceId, kind, id);
    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind,
        payload: next as Prisma.InputJsonValue,
      },
      update: {
        payload: next as Prisma.InputJsonValue,
      },
    });

    return next;
  }

  async advancePromptLifecycle(workspaceId: string, id: string) {
    const current = await this.findOne(workspaceId, 'prompt', id);
    const next = getNextPromptLifecycle(String(current.lifecycle));
    if (!next) throw new NotFoundException('No next lifecycle stage');
    return this.updatePayload(workspaceId, 'prompt', id, { lifecycle: next });
  }

  async advanceAgentStatus(workspaceId: string, id: string) {
    const current = await this.findOne(workspaceId, 'agent', id);
    const next = getNextAgentStatus(String(current.status));
    if (!next) throw new NotFoundException('No next agent status');
    return this.updatePayload(workspaceId, 'agent', id, { status: next });
  }

  async advanceSkillLifecycle(workspaceId: string, id: string) {
    const current = await this.findOne(workspaceId, 'skill', id);
    const next = getNextSkillLifecycle(String(current.lifecycle));
    if (!next) throw new NotFoundException('No next skill lifecycle');
    return this.updatePayload(workspaceId, 'skill', id, { lifecycle: next });
  }

  async advanceWorkflowStatus(workspaceId: string, id: string) {
    const current = await this.findOne(workspaceId, 'workflow', id);
    const next = getNextWorkflowStatus(String(current.status));
    if (!next) throw new NotFoundException('No next workflow status');
    return this.updatePayload(workspaceId, 'workflow', id, { status: next });
  }

  async runKnowledgePipeline(workspaceId: string, baseId: string, docId: string) {
    const current = await this.findOne(workspaceId, 'knowledge', baseId);
    const documents = Array.isArray(current.documents)
      ? (current.documents as Record<string, unknown>[]).map((doc) => {
          if (doc.id !== docId) return doc;
          return { ...doc, status: 'indexed', chunks: 64 };
        })
      : [];

    return this.updatePayload(workspaceId, 'knowledge', baseId, {
      pipelineStage: 'ready',
      documents,
    });
  }

  async updateMemoryLayerPolicy(
    workspaceId: string,
    storeId: string,
    layer: string,
    patch: Record<string, unknown>,
  ) {
    const current = await this.findOne(workspaceId, 'memory', storeId);
    const policies = Array.isArray(current.policies)
      ? (current.policies as Record<string, unknown>[]).map((policy) =>
          policy.layer === layer ? { ...policy, ...patch } : policy,
        )
      : [];

    return this.updatePayload(workspaceId, 'memory', storeId, { policies });
  }

  async runMemoryReflection(workspaceId: string, storeId: string) {
    const current = await this.findOne(workspaceId, 'memory', storeId);
    const reflectionLogs = Array.isArray(current.reflectionLogs) ? [...current.reflectionLogs] : [];
    const newLog = {
      id: `ref_${Date.now()}`,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      summary: 'Session → Long 晋升 2 条 · Decay 清理 5 条低分记忆',
      promoted: 2,
      pruned: 5,
    };

    return this.updatePayload(workspaceId, 'memory', storeId, {
      reflectionLogs: [newLog, ...reflectionLogs].slice(0, 5),
    });
  }

  async seedAll() {
    let count = 0;
    for (const kind of [
      'prompt',
      'agent',
      'skill',
      'workflow',
      'knowledge',
      'tool',
      'memory',
    ] as CenterKind[]) {
      for (const [workspaceId, items] of Object.entries(LOCAL_CATALOGS[kind])) {
        for (const item of items) {
          const id = String(item.id);
          await this.prisma.centerRecord.upsert({
            where: { id },
            create: {
              id,
              workspaceId,
              kind,
              payload: item as Prisma.InputJsonValue,
            },
            update: {
              workspaceId,
              kind,
              payload: item as Prisma.InputJsonValue,
            },
          });
          count += 1;
        }
      }
    }
    return count;
  }
}
