import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MarketplacePayload {
  agents?: unknown[];
  skills?: unknown[];
  tools?: unknown[];
  automations?: unknown[];
  kbDocs?: unknown[];
}

export interface PortalContentPayload {
  items?: unknown[];
  /** 乐观锁版本；客户端 PUT 时带 expectedRevision */
  revision?: number;
  expectedRevision?: number;
}

@Injectable()
export class PersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSessions(workspaceId: string) {
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!row) throw new NotFoundException(`Workspace ${workspaceId} not found`);
    const catalog = row.catalogJson as Record<string, unknown>;
    return { chats: (catalog.chats as Record<string, unknown>) ?? {} };
  }

  async putSessions(workspaceId: string, chats: Record<string, unknown>) {
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!row) throw new NotFoundException(`Workspace ${workspaceId} not found`);
    const catalog = { ...(row.catalogJson as Record<string, unknown>), chats };
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { catalogJson: catalog as Prisma.InputJsonValue },
    });
    return { chats };
  }

  async getMarketplace(workspaceId: string): Promise<MarketplacePayload | null> {
    const row = await this.prisma.centerRecord.findFirst({
      where: { workspaceId, kind: 'marketplace' },
    });
    if (!row) return null;
    return row.payload as MarketplacePayload;
  }

  async putMarketplace(workspaceId: string, payload: MarketplacePayload) {
    const id = `marketplace-${workspaceId}`;
    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: 'marketplace',
        payload: payload as Prisma.InputJsonValue,
      },
      update: {
        payload: payload as Prisma.InputJsonValue,
      },
    });
    return payload;
  }

  async getPortalContent(workspaceId: string): Promise<PortalContentPayload | null> {
    const row = await this.prisma.centerRecord.findFirst({
      where: { workspaceId, kind: 'portal-content' },
    });
    if (!row) return null;
    const payload = row.payload as PortalContentPayload;
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      revision: typeof payload.revision === 'number' ? payload.revision : 0,
    };
  }

  async putPortalContent(workspaceId: string, payload: PortalContentPayload) {
    const id = `portal-content-${workspaceId}`;
    const existing = await this.prisma.centerRecord.findUnique({ where: { id } });
    const current = (existing?.payload as PortalContentPayload | undefined) ?? {};
    const currentRev = typeof current.revision === 'number' ? current.revision : 0;
    const expected =
      typeof payload.expectedRevision === 'number' ? payload.expectedRevision : undefined;

    // 有 expectedRevision 时做乐观锁；缺省（旧客户端）仍允许写入并递增
    if (expected != null && expected !== currentRev) {
      throw new ConflictException({
        message: 'portal_content_conflict',
        revision: currentRev,
        items: Array.isArray(current.items) ? current.items : [],
      });
    }

    const nextRev = currentRev + 1;
    const nextPayload: PortalContentPayload = {
      items: Array.isArray(payload.items) ? payload.items : [],
      revision: nextRev,
    };

    await this.prisma.centerRecord.upsert({
      where: { id },
      create: {
        id,
        workspaceId,
        kind: 'portal-content',
        payload: nextPayload as Prisma.InputJsonValue,
      },
      update: {
        payload: nextPayload as Prisma.InputJsonValue,
      },
    });
    return nextPayload;
  }
}
