/**
 * 一次性迁移：整理数据库里的文件引用。
 *   1. 内嵌图片（整串 data:image/...;base64 字段值）上传到对象存储，替换成 /api/v1/blobs/<id>。
 *      不处理 SVG（API 按附件下载返回，<img> 显示不了）和 HTML 正文中间嵌着的图片。
 *   2. 去租户前的文件地址 /api/v1/workspaces/<ws>/blobs/<id> 改写为 /api/v1/blobs/<id>（字符串中任意位置）。
 * 范围：center_record.payload、app_setting.value（原工作区目录与对话记录）、案例洞察的封面和正文。
 *
 * 用法（在 apps/api 下；停机执行，先备份数据库）：npm run migrate:blob-refs
 * 读写的是 PG 新表，所以要在 migrate:sqlite-to-pg 之后运行。
 * 可重复执行：替换后的值不再匹配，第二次运行不会再有改动。
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { BlobStoreService } from '../dist/persistence/blob-store.service.js';

const INLINE_IMAGE = /^data:(image\/(?:png|jpeg|gif|webp|avif));base64,([A-Za-z0-9+/=\s]+)$/i;
const LEGACY_BLOB_URL = /\/api\/v1\/workspaces\/[A-Za-z0-9_-]+\/blobs\/([0-9a-f]{32})/g;

const prisma = new PrismaClient();
const store = new BlobStoreService();
await store.onModuleInit();

const urlByContent = new Map();
const report = { uploaded: 0, inlined: 0, rewritten: 0, rows: 0, failed: [] };

async function uploadInline(dataUrl) {
  const contentKey = createHash('sha256').update(dataUrl).digest('hex');
  const known = urlByContent.get(contentKey);
  if (known) return known;
  const [, mimeType, base64] = INLINE_IMAGE.exec(dataUrl);
  const ext = mimeType.toLowerCase().split('/')[1].replace('jpeg', 'jpg');
  const uploaded = await store.putBase64({
    name: `image.${ext}`,
    mimeType: mimeType.toLowerCase(),
    dataBase64: base64.replace(/\s/g, ''),
  });
  urlByContent.set(contentKey, uploaded.url);
  report.uploaded += 1;
  return uploaded.url;
}

/** 返回替换后的值和替换次数；不修改入参。 */
async function replaceRefs(value) {
  if (typeof value === 'string') {
    if (INLINE_IMAGE.test(value)) {
      report.inlined += 1;
      return [await uploadInline(value), 1];
    }
    let n = 0;
    const next = value.replace(LEGACY_BLOB_URL, (_, id) => {
      n += 1;
      return `/api/v1/blobs/${id}`;
    });
    report.rewritten += n;
    return [next, n];
  }
  if (!value || typeof value !== 'object') return [value, 0];
  let count = 0;
  const out = Array.isArray(value) ? [] : {};
  for (const [key, child] of Object.entries(value)) {
    const [next, n] = await replaceRefs(child);
    out[key] = next;
    count += n;
  }
  return [out, count];
}

async function migrateRows(label, rows, update) {
  for (const row of rows) {
    try {
      const data = {};
      let changes = 0;
      for (const [column, value] of Object.entries(row.columns)) {
        const [next, n] = await replaceRefs(value);
        if (n) data[column] = next;
        changes += n;
      }
      if (!changes) continue;
      await update(row.id, data);
      report.rows += 1;
    } catch (err) {
      report.failed.push(`${label} ${row.id}：${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

let cursor;
for (;;) {
  const rows = await prisma.centerRecord.findMany({
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' },
    select: { id: true, payload: true },
  });
  if (!rows.length) break;
  cursor = rows[rows.length - 1].id;
  await migrateRows(
    'CenterRecord',
    rows.map((row) => ({ id: row.id, columns: { payload: row.payload } })),
    (id, data) => prisma.centerRecord.update({ where: { id }, data }),
  );
}

const settings = await prisma.appSetting.findMany({ select: { settingKey: true, value: true } });
await migrateRows(
  'AppSetting',
  settings.map((row) => ({ id: row.settingKey, columns: { value: row.value } })),
  (settingKey, data) => prisma.appSetting.update({ where: { settingKey }, data }),
);

const articleColumns = {
  draftCoverImage: true,
  publishedCoverImage: true,
  draftHtml: true,
  publishedHtml: true,
  draftMarkdown: true,
  publishedMarkdown: true,
};
const articles = await prisma.caseInsightArticle.findMany({ select: { id: true, ...articleColumns } });
await migrateRows(
  'CaseInsightArticle',
  articles.map(({ id, ...columns }) => ({ id, columns })),
  (id, data) => prisma.caseInsightArticle.update({ where: { id }, data }),
);

await prisma.$disconnect();
console.log(
  `完成：更新 ${report.rows} 行；内嵌图片 ${report.inlined} 处（上传 ${report.uploaded} 张，相同图片只传一次）；` +
    `旧文件地址改写 ${report.rewritten} 处；失败 ${report.failed.length}`,
);
for (const line of report.failed) console.error(`  失败 ${line}`);
process.exit(report.failed.length ? 1 : 0);
