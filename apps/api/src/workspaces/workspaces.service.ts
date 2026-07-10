import { Injectable, NotFoundException } from '@nestjs/common';
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
    const row = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!row) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
    return row.catalogJson;
  }
}
