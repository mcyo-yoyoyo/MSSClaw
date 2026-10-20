/**
 * 过渡表 center_record 的原始 SQL 访问。第 6 期起 Prisma 里已没有这个模型，表由 migrate:remaining 搬完后删除；
 * 第 2~5 期迁移脚本仍通过这里读写它，用法与原 prisma.centerRecord 相同（只支持这些脚本用到的写法）。
 *
 * 全新库上 migrate deploy 会一次跑完所有迁移，把空的 center_record 先删掉；
 * 所以第 2 期脚本写入前调用 ensureCenterRecordTable 重建，后面各期脚本照常读取，最后由第 6 期脚本删表。
 */

export async function ensureCenterRecordTable(db) {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS center_record (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload JSONB NOT NULL, updated_at TIMESTAMPTZ(3) NOT NULL
  )`);
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS center_record_kind_idx ON center_record (kind)');
}

export async function centerRecordTableExists(db) {
  const [row] = await db.$queryRawUnsafe(`SELECT to_regclass('center_record') IS NOT NULL AS "exists"`);
  return Boolean(row?.exists);
}

/** where 只支持 id / kind 的等值或 { in: [] }，以及 OR 组合 */
function clause(where, params) {
  const parts = [];
  for (const [key, value] of Object.entries(where ?? {})) {
    if (key === 'OR') {
      parts.push(`(${value.map((item) => clause(item, params)).join(' OR ')})`);
      continue;
    }
    if (key !== 'id' && key !== 'kind') throw new Error(`center_record 不支持按 ${key} 过滤`);
    if (value && typeof value === 'object') {
      if (!Array.isArray(value.in)) throw new Error(`center_record 不支持的条件：${JSON.stringify(value)}`);
      params.push(value.in);
      parts.push(`${key} = ANY($${params.length}::text[])`);
    } else {
      params.push(value);
      parts.push(`${key} = $${params.length}`);
    }
  }
  return parts.length ? parts.join(' AND ') : 'TRUE';
}

export function centerRecord(db) {
  const rows = async (where, tail = '', tailParams = []) => {
    if (!(await centerRecordTableExists(db))) return [];
    const params = [];
    const sql = `SELECT id, kind, payload, updated_at AS "updatedAt" FROM center_record WHERE ${clause(where, params)}`;
    const shifted = tail.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + params.length}`);
    return db.$queryRawUnsafe(`${sql} ${shifted}`, ...params, ...tailParams);
  };
  return {
    async count() {
      if (!(await centerRecordTableExists(db))) return 0;
      const [row] = await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM center_record');
      return row.n;
    },
    /** 分页只支持 orderBy id 升序 + cursor/skip:1 + take（migrate-blob-refs 的写法） */
    async findMany({ where, take, cursor } = {}) {
      const tailParams = [];
      let tail = '';
      if (cursor) {
        tailParams.push(cursor.id);
        tail += `AND id > $${tailParams.length} `;
      }
      tail += 'ORDER BY id';
      if (take) {
        tailParams.push(take);
        tail += ` LIMIT $${tailParams.length}`;
      }
      return rows(where, tail, tailParams);
    },
    async findUnique({ where }) {
      return (await rows({ id: where.id }))[0] ?? null;
    },
    async groupBy({ where }) {
      const list = await rows(where);
      const counts = new Map();
      for (const row of list) counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
      return [...counts].map(([kind, n]) => ({ kind, _count: n }));
    },
    async createMany({ data, skipDuplicates }) {
      let count = 0;
      for (const row of data) {
        count += await db.$executeRawUnsafe(
          `INSERT INTO center_record (id, kind, payload, updated_at) VALUES ($1, $2, $3::jsonb, $4)${skipDuplicates ? ' ON CONFLICT (id) DO NOTHING' : ''}`,
          row.id,
          row.kind,
          JSON.stringify(row.payload),
          row.updatedAt ?? new Date(),
        );
      }
      return { count };
    },
    async update({ where, data }) {
      await db.$executeRawUnsafe(
        'UPDATE center_record SET payload = $2::jsonb, updated_at = now() WHERE id = $1',
        where.id,
        JSON.stringify(data.payload),
      );
    },
    async updateMany({ where, data }) {
      const params = [JSON.stringify(data.payload)];
      const count = await db.$executeRawUnsafe(
        `UPDATE center_record SET payload = $1::jsonb, updated_at = now() WHERE ${clause(where, params)}`,
        ...params,
      );
      return { count };
    },
    async deleteMany({ where }) {
      if (!(await centerRecordTableExists(db))) return { count: 0 };
      const params = [];
      const count = await db.$executeRawUnsafe(`DELETE FROM center_record WHERE ${clause(where, params)}`, ...params);
      return { count };
    },
  };
}
