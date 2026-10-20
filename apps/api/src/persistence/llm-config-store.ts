import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { decryptSecret, encryptSecret } from '../common/secret-box';
import { inTransaction, readRows, replaceRows, type Db, type TableSpec } from './json-table';

/**
 * 模型配置 doc:llm-config ↔ llm_model_config + app_setting('llm-selection')。
 * 接口形状不变：{ model, defaultModelId, baseUrl, apiKey, platformModels[], customModels[] }。
 * 所有 apiKey 落库前加密、读出时解密；顶层 baseUrl / apiKey（所选模型快照，兼容旧版只填顶层 Key）也加密存在 llm-selection。
 */

type JsonRecord = Record<string, unknown>;

const MODEL: TableSpec = {
  label: 'invalid_llm_model',
  model: 'llmModelConfig',
  key: 'id',
  position: true,
  fields: {
    id: { type: 'string', required: true, column: 'modelId' },
    label: { type: 'string', required: true },
    baseUrl: { type: 'string', required: true },
    providerName: { type: 'string' },
    apiKey: { type: 'string' },
    enabled: { type: 'bool' },
    source: { type: 'string' },
  },
};

const SCOPES = { platformModels: 'platform', customModels: 'custom' } as const;
const SELECTION_KEY = 'llm-selection';
const TOP_LEVEL = new Set(['model', 'defaultModelId', 'baseUrl', 'apiKey', 'platformModels', 'customModels']);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const withKey = (item: JsonRecord, transform: (value: string) => string) =>
  typeof item.apiKey === 'string' ? { ...item, apiKey: transform(item.apiKey) } : item;

/** 从没保存过时返回 null，调用方按默认配置播种 */
export async function readLlmConfigDoc(db: Db): Promise<JsonRecord | null> {
  const [selection, platformModels, customModels] = await Promise.all([
    db.appSetting.findUnique({ where: { settingKey: SELECTION_KEY } }),
    readRows(db, MODEL, { scope: 'platform' }),
    readRows(db, MODEL, { scope: 'custom' }),
  ]);
  if (!selection && !platformModels.length && !customModels.length) return null;
  const top = isRecord(selection?.value) ? selection.value : {};
  return {
    ...withKey(top, decryptSecret),
    platformModels: platformModels.map((item) => withKey(item, decryptSecret)),
    customModels: customModels.map((item) => withKey(item, decryptSecret)),
  };
}

export async function writeLlmConfigDoc(prisma: Db, payload: unknown) {
  if (!isRecord(payload)) throw new BadRequestException('llm_config_object_required');
  for (const key of Object.keys(payload)) {
    if (!TOP_LEVEL.has(key)) throw new BadRequestException(`invalid_llm_config:unknown_field_${key}`);
  }
  const top: JsonRecord = {};
  for (const key of ['model', 'defaultModelId', 'baseUrl', 'apiKey']) {
    const value = payload[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') throw new BadRequestException(`invalid_llm_config:${key}_must_be_string`);
    top[key] = value;
  }
  await inTransaction(prisma, async (tx) => {
    for (const [field, scope] of Object.entries(SCOPES)) {
      const list = payload[field];
      if (list !== undefined && !Array.isArray(list)) throw new BadRequestException(`invalid_llm_config:${field}_must_be_array`);
      const items = (list ?? []).map((item: unknown) => (isRecord(item) ? withKey(item, encryptSecret) : item));
      await replaceRows(tx, MODEL, items, { where: { scope }, fixed: { scope } });
    }
    const value = withKey(top, encryptSecret) as Prisma.InputJsonObject;
    await tx.appSetting.upsert({
      where: { settingKey: SELECTION_KEY },
      create: { settingKey: SELECTION_KEY, value },
      update: { value, revision: { increment: 1 } },
    });
  });
  return readLlmConfigDoc(prisma);
}
