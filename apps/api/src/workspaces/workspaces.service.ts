import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ensureWorkspace } from './workspace-setting';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findCatalog() {
    const row = await ensureWorkspace(this.prisma);
    const json = row.catalogJson as { workspace?: unknown } | null;
    // 会话在 chat_session 表，按登录人走 /sessions；目录里一律不带，旧库没迁走的也不外露
    if (json && typeof json === 'object' && json.workspace) return { ...json, chats: {} };
    return {
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
    };
  }
}
