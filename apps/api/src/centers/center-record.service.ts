import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getNextPromptLifecycle,
  getNextWorkflowStatus,
  type CenterKind,
} from './center-lifecycle';
import { readAssets } from '../persistence/asset-catalog';
import {
  mapMarketplaceAgentToCenter,
  mapMarketplaceSkillToCenter,
  mapMarketplaceToolToCenter,
} from '../persistence/marketplace-center-sync';

/** Agent / Skill / 工具在资产表里；中心接口按旧形状实时映射出来，只有 Agent 人设可以改。 */
const ASSET_CENTER_KINDS = {
  agent: mapMarketplaceAgentToCenter,
  skill: mapMarketplaceSkillToCenter,
  tool: mapMarketplaceToolToCenter,
} as const;
type AssetCenterKind = keyof typeof ASSET_CENTER_KINDS;

function isAssetCenterKind(kind: CenterKind | string): kind is AssetCenterKind {
  return kind in ASSET_CENTER_KINDS;
}

const ASSET_MANAGED_IN_MARKET = '上下架和资产信息请到货架运营里修改';

@Injectable()
export class CenterRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, kind: CenterKind) {
    if (isAssetCenterKind(kind)) return this.listAssets(kind);
    const rows = await this.prisma.centerRecord.findMany({
      where: { kind },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => row.payload as Record<string, unknown>);
  }

  private async listAssets(kind: AssetCenterKind) {
    const items = await readAssets(this.prisma, kind);
    return items
      .map((item) => ASSET_CENTER_KINDS[kind](item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  async findOne(workspaceId: string, kind: CenterKind, id: string) {
    if (isAssetCenterKind(kind)) {
      const item = (await this.listAssets(kind)).find((candidate) => String(candidate.id) === id);
      if (!item) throw new NotFoundException(`${kind} ${id} not found`);
      return item;
    }
    const row = await this.prisma.centerRecord.findFirst({
      where: { id, kind },
    });
    if (row) return row.payload as Record<string, unknown>;
    throw new NotFoundException(`${kind} ${id} not found`);
  }

  async updatePayload(
    workspaceId: string,
    kind: CenterKind,
    id: string,
    patch: Record<string, unknown>,
  ) {
    if (isAssetCenterKind(kind)) return this.updateAsset(workspaceId, kind, id, patch);
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
        kind,
        payload: next as Prisma.InputJsonValue,
      },
      update: {
        payload: next as Prisma.InputJsonValue,
      },
    });

    return next;
  }

  /** 旧版 Agent Studio 改人设：写回 Agent 的系统提示词；其余字段一律去货架运营改。 */
  private async updateAsset(
    workspaceId: string,
    kind: AssetCenterKind,
    id: string,
    patch: Record<string, unknown>,
  ) {
    const keys = Object.keys(patch).filter((key) => patch[key] !== undefined);
    if (kind !== 'agent' || keys.some((key) => key !== 'persona') || typeof patch.persona !== 'string') {
      throw new ConflictException(ASSET_MANAGED_IN_MARKET);
    }
    await this.findOne(workspaceId, kind, id);
    await this.prisma.agent.update({ where: { id }, data: { systemPrompt: patch.persona } });
    return this.findOne(workspaceId, kind, id);
  }

  async advancePromptLifecycle(workspaceId: string, id: string) {
    const current = await this.findOne(workspaceId, 'prompt', id);
    const next = getNextPromptLifecycle(String(current.lifecycle));
    if (!next) throw new NotFoundException('No next lifecycle stage');
    return this.updatePayload(workspaceId, 'prompt', id, { lifecycle: next });
  }

  async advanceAgentStatus(_workspaceId: string, _id: string): Promise<never> {
    throw new ConflictException(ASSET_MANAGED_IN_MARKET);
  }

  async advanceSkillLifecycle(_workspaceId: string, _id: string): Promise<never> {
    throw new ConflictException(ASSET_MANAGED_IN_MARKET);
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

}
