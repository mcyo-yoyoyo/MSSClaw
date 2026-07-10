import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface MarketplacePayload {
  agents?: unknown[];
  skills?: unknown[];
  automations?: unknown[];
  kbDocs?: unknown[];
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
}
