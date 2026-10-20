import type { Prisma } from '@prisma/client';
import { PLATFORM_WORKSPACE_ID } from '../common/platform-workspace';
import type { PrismaService } from '../prisma/prisma.service';

/** 原 Workspace 表的那一行；第 2 期起存为 app_setting('workspace')，value 里的 catalog 即原 catalogJson。 */
export type WorkspaceRow = {
  id: string;
  name: string;
  namespace: string;
  description: string;
  memberCount: number;
  defaultChatId: string;
  catalogJson: Prisma.JsonValue;
};

type WorkspaceSettingValue = Omit<WorkspaceRow, 'id' | 'catalogJson'> & { catalog: Prisma.JsonValue };

const SETTING_KEY = 'workspace';

function toRow(value: Prisma.JsonValue): WorkspaceRow {
  const { catalog, ...rest } = value as unknown as WorkspaceSettingValue;
  return { id: PLATFORM_WORKSPACE_ID, ...rest, catalogJson: catalog ?? {} };
}

export async function findWorkspace(prisma: PrismaService): Promise<WorkspaceRow | null> {
  const row = await prisma.appSetting.findUnique({ where: { settingKey: SETTING_KEY } });
  return row ? toRow(row.value) : null;
}

/** 本地 / 首次启动：缺少时补一行空目录，避免 login/docs 直接 404。 */
export async function ensureWorkspace(prisma: PrismaService): Promise<WorkspaceRow> {
  const existing = await findWorkspace(prisma);
  if (existing) return existing;
  const value: WorkspaceSettingValue = {
    name: PLATFORM_WORKSPACE_ID,
    namespace: PLATFORM_WORKSPACE_ID,
    description: 'Auto-provisioned workspace',
    memberCount: 0,
    defaultChatId: 'default',
    catalog: {},
  };
  const row = await prisma.appSetting.upsert({
    where: { settingKey: SETTING_KEY },
    create: { settingKey: SETTING_KEY, value: value as unknown as Prisma.InputJsonValue },
    update: {},
  });
  return toRow(row.value);
}
