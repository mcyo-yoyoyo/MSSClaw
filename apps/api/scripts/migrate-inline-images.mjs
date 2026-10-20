/**
 * 一次性迁移：把数据库里内嵌的图片（整串 data:image/...;base64 字段值）上传到对象存储，替换成 blob 地址。
 * 范围：CenterRecord.payload 中任意位置（工具 Logo、Skill 图标、Agent 头像、门户内容等），
 *       以及案例洞察封面 CaseInsightArticle.draftCoverImage / publishedCoverImage。
 * 不处理：SVG（API 按附件下载返回，<img> 显示不了）；HTML 正文中间嵌着的图片。
 *
 * 用法（在 apps/api 下；停机执行，先备份数据库）：npm run migrate:inline-images
 * 可重复执行：替换后的值不再是 data URL，第二次运行不会再有改动。
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { BlobStoreService } from '../dist/persistence/blob-store.service.js';

const INLINE_IMAGE = /^data:(image\/(?:png|jpeg|gif|webp|avif));base64,([A-Za-z0-9+/=\s]+)$/i;
const SAFE_WORKSPACE = /^[A-Za-z0-9_-]+$/;

const prisma = new PrismaClient();
const store = new BlobStoreService();
await store.onModuleInit();

const urlByContent = new Map();
const report = { uploaded: 0, replaced: 0, rows: 0, failed: [] };

async function toBlobUrl(dataUrl, workspaceId) {
  const contentKey = createHash('sha256').update(dataUrl).digest('hex');
  const known = urlByContent.get(contentKey);
  if (known) return known;
  const [, mimeType, base64] = INLINE_IMAGE.exec(dataUrl);
  const ext = mimeType.toLowerCase().split('/')[1].replace('jpeg', 'jpg');
  const uploaded = await store.putBase64(SAFE_WORKSPACE.test(workspaceId) ? workspaceId : 'global', {
    name: `image.${ext}`,
    mimeType: mimeType.toLowerCase(),
    dataBase64: base64.replace(/\s/g, ''),
  });
  urlByContent.set(contentKey, uploaded.url);
  report.uploaded += 1;
  return uploaded.url;
}

/** 返回替换后的值和替换次数；不修改入参。 */
async function replaceInline(value, workspaceId) {
  if (typeof value === 'string') {
    return INLINE_IMAGE.test(value) ? [await toBlobUrl(value, workspaceId), 1] : [value, 0];
  }
  if (!value || typeof value !== 'object') return [value, 0];
  let count = 0;
  const out = Array.isArray(value) ? [] : {};
  for (const [key, child] of Object.entries(value)) {
    const [next, n] = await replaceInline(child, workspaceId);
    out[key] = next;
    count += n;
  }
  return [out, count];
}

let cursor;
for (;;) {
  const rows = await prisma.centerRecord.findMany({
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: 'asc' },
    select: { id: true, workspaceId: true, payload: true },
  });
  if (!rows.length) break;
  cursor = rows[rows.length - 1].id;
  for (const row of rows) {
    try {
      const [payload, n] = await replaceInline(row.payload, row.workspaceId);
      if (!n) continue;
      await prisma.centerRecord.update({ where: { id: row.id }, data: { payload } });
      report.replaced += n;
      report.rows += 1;
    } catch (err) {
      report.failed.push(`CenterRecord ${row.id}：${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

const articles = await prisma.caseInsightArticle.findMany({
  select: { id: true, workspaceId: true, draftCoverImage: true, publishedCoverImage: true },
});
for (const row of articles) {
  try {
    const [draftCoverImage, a] = await replaceInline(row.draftCoverImage, row.workspaceId);
    const [publishedCoverImage, b] = await replaceInline(row.publishedCoverImage, row.workspaceId);
    if (!a && !b) continue;
    await prisma.caseInsightArticle.update({
      where: { id: row.id },
      data: { draftCoverImage, publishedCoverImage },
    });
    report.replaced += a + b;
    report.rows += 1;
  } catch (err) {
    report.failed.push(`CaseInsightArticle ${row.id}：${err instanceof Error ? err.message : String(err)}`);
  }
}

await prisma.$disconnect();
console.log(
  `完成：更新 ${report.rows} 行，替换 ${report.replaced} 处内嵌图片，上传 ${report.uploaded} 张（相同图片只传一次），失败 ${report.failed.length}`,
);
for (const line of report.failed) console.error(`  失败 ${line}`);
process.exit(report.failed.length ? 1 : 0);
