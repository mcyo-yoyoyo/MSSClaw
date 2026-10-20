import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}


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
    const json = row.catalogJson as {
      workspace?: unknown;
      chats?: Record<string, unknown>;
      resources?: unknown[];
    } | null;
    const empty =
      !json ||
      typeof json !== 'object' ||
      !json.workspace ||
      !json.chats ||
      (Object.keys(json.chats).length === 0 && (json.resources?.length ?? 0) === 0);
    return empty && json?.workspace
      ? json
      : empty
        ? {
            workspace: {
              id: row.id,
              name: row.name,
              namespace: row.namespace,
              description: row.description,
              memberCount: row.memberCount,
            },
            chats: {},
            resources: [],
            defaultChatId: row.defaultChatId || 'default',
          }
        : row.catalogJson;
  }

  private async ensureWorkspaceRow(workspaceId: string) {
    const existing = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (existing) return existing;


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
