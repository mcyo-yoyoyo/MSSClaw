import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  WORKSPACE_CATALOGS,
  buildCatalogPayload,
} from '../data/workspace-catalogs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.workspace.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        namespace: true,
        description: true,
        memberCount: true,
        defaultChatId: true,
        updatedAt: true,
      },
    });
    return { workspaces: rows };
  }

  async findCatalog(workspaceId: string) {
    let row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!row) {
      // Align with platform-docs ensureWorkspace: auto-provision known seeds / stub
      // so frontend catalog probes do not spam 404 for valid tenant ids.
      row = await this.ensureWorkspaceRow(workspaceId);
    }
    if (!row) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
    return row.catalogJson;
  }

  private async ensureWorkspaceRow(workspaceId: string) {
    const existing = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (existing) return existing;

    const catalog = WORKSPACE_CATALOGS.find((c) => c.workspace.id === workspaceId);
    if (catalog) {
      return this.prisma.workspace.create({
        data: {
          id: catalog.workspace.id,
          name: catalog.workspace.name,
          namespace: catalog.workspace.namespace,
          description: catalog.workspace.description,
          memberCount: catalog.workspace.memberCount,
          defaultChatId: catalog.defaultChatId,
          catalogJson: buildCatalogPayload(catalog) as Prisma.InputJsonValue,
        },
      });
    }

    // Unknown id: create a minimal stub so subsequent docs/login share the same tenant.
    return this.prisma.workspace.create({
      data: {
        id: workspaceId,
        name: workspaceId,
        namespace: workspaceId,
        description: 'Auto-provisioned workspace',
        memberCount: 0,
        defaultChatId: 'default',
        catalogJson: {
          workspace: {
            id: workspaceId,
            name: workspaceId,
            namespace: workspaceId,
            description: 'Auto-provisioned workspace',
            memberCount: 0,
          },
          chats: {},
          resources: [],
          defaultChatId: 'default',
        } as Prisma.InputJsonValue,
      },
    });
  }
}
