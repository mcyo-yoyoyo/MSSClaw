import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureWorkspace } from './workspace-setting';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findCatalog() {
    const row = await ensureWorkspace(this.prisma);
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
}
