#!/usr/bin/env node
/**
 * 第 4 期：把成员、密码、登录会话从 center_record 文档拆进身份表（停机执行，先 pg_dump 备份）。
 *
 * 来源（平台空间各一行）：doc:members、doc:auth-credentials、doc:auth-sessions。
 *   - 成员原样迁移；「最近活跃」文案不迁（改由最后登录时间生成）。
 *   - 密码按归一化邮箱挂到成员上；找不到成员的密码丢弃（会列出来）。
 *   - 口令策略存进 app_setting('auth-policy')；两个文档的版本号存进 collection_revision。
 *   - 只迁未过期的会话，令牌改存 SHA-256，已登录的人不用重新登录；找不到成员的会话丢弃。
 * 写完后删除这三行旧文档。
 *
 * 用法（apps/api 目录）：
 *   npm run migrate:identity             只读预览
 *   npm run migrate:identity -- --apply  写入：身份表必须为空，全部在一个事务里，失败整体回滚
 */
import { PrismaClient } from '@prisma/client';
import {
  expectedRevisionOf,
  hashToken,
  memberToJson,
  normalizeCredentialMap,
  normalizedAccountEmail,
  prepareMembers,
  readCredentialsDoc,
} from '../dist/persistence/identity-store.js';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const optionalText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

async function main() {
  const docs = await prisma.centerRecord.findMany({
    where: { kind: { in: ['doc:members', 'doc:auth-credentials', 'doc:auth-sessions'] } },
  });
  const byKind = new Map();
  for (const row of docs) {
    if (byKind.has(row.kind)) throw new Error(`${row.kind} 有多行（${row.id}），只应有平台空间那一行`);
    byKind.set(row.kind, row);
  }
  const membersDoc = byKind.get('doc:members')?.payload ?? { members: [] };
  const credentialsDoc = byKind.get('doc:auth-credentials')?.payload ?? {};
  const sessionsDoc = byKind.get('doc:auth-sessions')?.payload ?? {};

  // 成员：管理员可编辑字段沿用接口校验；统一身份回写的三个字段从原文档带过来
  const sourceMembers = Array.isArray(membersDoc.members) ? membersDoc.members.filter(isRecord) : [];
  const prepared = prepareMembers({ members: sourceMembers.map(({ externalId, postName, orgPath, ...rest }) => rest) });
  const externalIds = new Set();
  const members = prepared.map((member, index) => {
    const source = sourceMembers[index];
    const externalId = optionalText(source.externalId);
    if (externalId) {
      if (externalIds.has(externalId)) throw new Error(`成员 ${member.id} 的 externalId ${externalId} 与其他成员重复`);
      externalIds.add(externalId);
    }
    return { ...member, externalId, postName: optionalText(source.postName), orgPath: optionalText(source.orgPath) };
  });
  const memberIdByEmail = new Map(members.filter((m) => m.email).map((m) => [m.email, m.id]));
  const memberIdByExternalId = new Map(members.filter((m) => m.externalId).map((m) => [m.externalId, m.id]));
  const memberIds = new Set(members.map((m) => m.id));

  // 密码
  const credentials = [];
  const orphanCredentials = [];
  for (const [email, credential] of normalizeCredentialMap(credentialsDoc.credentials)) {
    const memberId = memberIdByEmail.get(email);
    if (!memberId) {
      orphanCredentials.push(email);
      continue;
    }
    const parsed = Date.parse(credential.updatedAt);
    credentials.push({
      memberId,
      salt: credential.salt,
      passwordHash: credential.hash,
      passwordUpdatedAt: Number.isFinite(parsed) ? new Date(parsed) : new Date(),
    });
  }
  const policy = { allowDemoPassword: !(isRecord(credentialsDoc.policy) && credentialsDoc.policy.allowDemoPassword === false) };

  // 会话
  const now = Date.now();
  const sessions = [];
  let expired = 0;
  const orphanSessions = [];
  for (const [token, entry] of Object.entries(isRecord(sessionsDoc.sessions) ? sessionsDoc.sessions : {})) {
    if (!isRecord(entry) || !isRecord(entry.user)) continue;
    const expiresAt = Date.parse(entry.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt < now) {
      expired += 1;
      continue;
    }
    const user = entry.user;
    const memberId =
      (memberIds.has(String(user.id ?? '')) ? String(user.id) : undefined) ??
      memberIdByExternalId.get(optionalText(user.externalId)) ??
      memberIdByEmail.get(normalizedAccountEmail(user.email));
    if (!memberId) {
      orphanSessions.push(String(user.email || user.id || '?'));
      continue;
    }
    const method = isRecord(entry.auth) ? entry.auth.method : undefined;
    // 旧令牌没有来源信息时按最弱的演示口令处理
    const authMethod = method === 'password' || method === 'oauth' ? method : 'demo';
    sessions.push({ tokenHash: hashToken(token), memberId, authMethod, expiresAt: new Date(expiresAt) });
  }

  const revisions = {
    members: expectedRevisionOf(membersDoc),
    'auth-credentials': expectedRevisionOf(credentialsDoc),
  };

  console.log(`成员 ${members.length}（externalId ${externalIds.size}）`);
  console.log(`密码 ${credentials.length}${orphanCredentials.length ? `，找不到成员丢弃 ${orphanCredentials.length}：${orphanCredentials.join('，')}` : ''}`);
  console.log(`口令策略 ${JSON.stringify(policy)}`);
  console.log(`会话 ${sessions.length}（已过期不迁 ${expired}${orphanSessions.length ? `，找不到成员丢弃 ${orphanSessions.length}：${orphanSessions.join('，')}` : ''}）`);
  console.log(`版本号 ${JSON.stringify(revisions)}`);

  if (!apply) {
    console.log('\n只读预览，未写入。确认无误后加 --apply 执行。');
    return;
  }

  const counts = await Promise.all([prisma.member.count(), prisma.memberCredential.count(), prisma.authSession.count()]);
  if (counts.some(Boolean)) throw new Error(`身份表不是空的（成员 ${counts[0]}，密码 ${counts[1]}，会话 ${counts[2]}），停止`);

  await prisma.$transaction(async (tx) => {
    await tx.member.createMany({ data: members });
    if (credentials.length) await tx.memberCredential.createMany({ data: credentials });
    if (sessions.length) await tx.authSession.createMany({ data: sessions });
    await tx.appSetting.upsert({
      where: { settingKey: 'auth-policy' },
      create: { settingKey: 'auth-policy', value: policy },
      update: { value: policy },
    });
    for (const [collection, revision] of Object.entries(revisions)) {
      await tx.collectionRevision.upsert({
        where: { collection },
        create: { collection, revision },
        update: { revision },
      });
    }
    await tx.centerRecord.deleteMany({ where: { id: { in: docs.map((row) => row.id) } } });
  }, { maxWait: 60_000, timeout: 300_000 });

  // 读回核对：成员逐字段（最近活跃除外）、密码逐条
  console.log('\n已写入，读回核对：');
  const stored = new Map((await prisma.member.findMany()).map((row) => [row.id, memberToJson(row)]));
  const memberDiffs = [];
  sourceMembers.forEach((source, index) => {
    const expected = members[index];
    const back = stored.get(expected.id);
    const fields = ['name', 'role', 'avatar', 'status', 'deptIds', 'regionId'];
    const changed = !back
      ? ['读不回来']
      : [
          ...fields.filter((key) => JSON.stringify(back[key]) !== JSON.stringify(expected[key])),
          ...(back.email !== (expected.email ?? '') ? ['email'] : []),
          ...['externalId', 'postName', 'orgPath'].filter((key) => (back[key] ?? null) !== expected[key]),
        ];
    if (changed.length) memberDiffs.push(`${expected.id}: ${changed.join(', ')}`);
  });
  const credentialDoc = await readCredentialsDoc(prisma);
  const credentialDiffs = credentials
    .map((credential) => {
      const email = members.find((m) => m.id === credential.memberId).email;
      const back = credentialDoc.credentials[email];
      return back && back.salt === credential.salt && back.hash === credential.passwordHash ? null : email;
    })
    .filter(Boolean);
  const sessionCount = await prisma.authSession.count();
  console.log(`  成员 ${stored.size}${memberDiffs.length ? `，有差异：${memberDiffs.join('；')}` : '，一致'}`);
  console.log(`  密码 ${Object.keys(credentialDoc.credentials).length}${credentialDiffs.length ? `，有差异：${credentialDiffs.join('，')}` : '，一致'}`);
  console.log(`  会话 ${sessionCount}${sessionCount === sessions.length ? '，一致' : `，应为 ${sessions.length}`}`);
  if (memberDiffs.length || credentialDiffs.length || sessionCount !== sessions.length) {
    process.exitCode = 1;
    console.log('\n读回有差异，请用备份恢复后排查。');
  } else {
    console.log('\n完成。');
  }
}

main()
  .catch((error) => {
    console.error(`\n失败：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
