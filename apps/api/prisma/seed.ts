import { Prisma, PrismaClient } from '@prisma/client';
import { CenterRecordService } from '../src/centers/center-record.service';
import { buildCatalogPayload, WORKSPACE_CATALOGS } from '../src/data/workspace-catalogs';
import { PrismaService } from '../src/prisma/prisma.service';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const centerService = new CenterRecordService(prismaService);

async function main() {
  for (const catalog of WORKSPACE_CATALOGS) {
    await prisma.workspace.upsert({
      where: { id: catalog.workspace.id },
      create: {
        id: catalog.workspace.id,
        name: catalog.workspace.name,
        namespace: catalog.workspace.namespace,
        description: catalog.workspace.description,
        memberCount: catalog.workspace.memberCount,
        defaultChatId: catalog.defaultChatId,
        catalogJson: buildCatalogPayload(catalog) as Prisma.InputJsonValue,
      },
      update: {
        name: catalog.workspace.name,
        namespace: catalog.workspace.namespace,
        description: catalog.workspace.description,
        memberCount: catalog.workspace.memberCount,
        defaultChatId: catalog.defaultChatId,
        catalogJson: buildCatalogPayload(catalog) as Prisma.InputJsonValue,
      },
    });
  }

  const centerCount = await centerService.seedAll();

  console.log(`Seeded ${WORKSPACE_CATALOGS.length} workspaces and ${centerCount} center records`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
