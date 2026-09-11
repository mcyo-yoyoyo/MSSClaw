/**
 * 打印每个工作区 llm-config 里「谁在用哪个模型」。
 *
 * 三条链路读的是三个不同字段，排查时先用这个脚本对齐：
 *   智库「帮找」  -> defaultModelId（组织默认）
 *   对话窗口      -> model（当前选中快照）
 *   模型配置-测试 -> 你点的那一行，和上面两个都无关
 *
 * 用法：node scripts/which-llm-model.mjs   （在 apps/api 下执行）
 * 只输出模型 id / 端点 / Key 是否为空，不打印任何 Key 内容。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function endpoint(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return baseUrl ? '(无效 URL) ' + baseUrl : '(空)';
  }
}

const rows = await prisma.centerRecord.findMany({ where: { kind: 'doc:llm-config' } });
if (!rows.length) console.log('没有找到任何 llm-config 文档。');

for (const row of rows) {
  const config = row.payload ?? {};
  const catalog = [
    ...(config.platformModels ?? []),
    ...(config.customModels ?? []),
  ];
  const usable = (m) =>
    m.enabled !== false && Boolean(m.baseUrl?.trim()) && Boolean(m.apiKey?.trim());
  const defaultEntry = catalog.find((m) => m.id === config.defaultModelId);

  console.log(`\n=== ${row.workspaceId} ===`);
  console.log(`智库「帮找」  defaultModelId = ${config.defaultModelId || '(未设置)'}`);
  console.log(`对话窗口      model          = ${config.model || '(未设置)'}`);
  console.log(
    `帮找能不能跑：${
      !defaultEntry
        ? '不能 —— 默认模型不在目录里'
        : usable(defaultEntry)
          ? '能'
          : '不能 —— 默认模型停用或缺 Base URL / API Key'
    }`,
  );
  console.log('目录：');
  for (const m of catalog) {
    console.log(
      `  ${String(m.id).padEnd(24)} ` +
        `${m.enabled === false ? '已停用' : '已启用'} ` +
        `key=${m.apiKey?.trim() ? '已配置' : '空   '} ` +
        `${endpoint(m.baseUrl)}` +
        `${m.id === config.defaultModelId ? '   <= 帮找用这个' : ''}`,
    );
  }
}

await prisma.$disconnect();
