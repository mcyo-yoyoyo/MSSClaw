#!/usr/bin/env node

/**
 * 从 AI工具完整清单-1.0.5.xlsx 生成外部/内部工具初始化数据。
 *
 * 默认只生成 JSON；加 --apply 才会通过全局工具 API 做一次性初始化。
 * JSON 同时保留内部场景明细；--apply 只写入 external + internal 工具目录。
 * 初始化完成后服务端会写入 initialized 标记，重复运行会安全跳过。
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const userHome = process.env.HOME || process.env.USERPROFILE || process.cwd();
const DEFAULT_INPUT = resolve(process.env.MSSCLAW_TOOL_XLSX || `${userHome}/Downloads/AI工具完整清单-1.0.5.xlsx`);
const DEFAULT_OUTPUT = resolve('outputs/tool-init/AI工具完整清单-1.0.5.tool-init.json');
const DEFAULT_API = process.env.MSSCLAW_API || 'http://localhost:3000/api/v1';

const TYPE_MAP = {
  通用AI助手: 'general',
  AI搜索与研究: 'search',
  知识管理与写作: 'knowledge',
  写作与翻译: 'writing',
  演示与文档: 'ppt',
  图像与设计: 'image',
  视频与数字人: 'video',
  音频与语音: 'audio',
  会议与协作: 'meeting',
  数据分析: 'data',
  编程开发: 'code',
  智能体: 'agent',
};

const TYPE_ICON = {
  general: 'fa-comments',
  search: 'fa-magnifying-glass',
  knowledge: 'fa-book',
  writing: 'fa-pen',
  ppt: 'fa-file-powerpoint',
  image: 'fa-image',
  video: 'fa-video',
  audio: 'fa-microphone',
  meeting: 'fa-users',
  data: 'fa-chart-line',
  code: 'fa-code',
  agent: 'fa-robot',
};

const INTERNAL_ID = {
  员工助手: 'tool-hw-assistant',
  云笔记: 'tool-hw-cloudnote',
  W3智能搜索: 'tool-hw-w3-qa',
  小鲁班: 'tool-hw-xiaoluban',
};

const INTERNAL_ICON = {
  员工助手: 'fa-user-tie',
  云笔记: 'fa-note-sticky',
  W3智能搜索: 'fa-magnifying-glass',
  小鲁班: 'fa-screwdriver-wrench',
};

const INTERNAL_LOGO = {
  员工助手: '/brand/internal-tools/employee-assistant.png',
  云笔记: '/brand/internal-tools/cloud-note.png',
  W3智能搜索: '/brand/internal-tools/w3-search.png',
  小鲁班: '/brand/internal-tools/xiaoluban.jpg',
};

// 与后端现有 canonical seed 对齐；其余名称使用确定性 tool-ext-* ID。
const EXTERNAL_ID = {
  ChatGPT: 'tool-saas-chatgpt',
  Claude: 'tool-saas-claude',
  DeepSeek: 'tool-saas-deepseek',
  Kimi: 'tool-saas-kimi',
  Perplexity: 'tool-saas-perplexity',
  秘塔AI搜索: 'tool-saas-metaso',
  NotebookLM: 'tool-ext-notebooklm',
  'Notion AI': 'tool-saas-notion-ai',
  Gamma: 'tool-saas-gamma',
  Midjourney: 'tool-saas-midjourney',
  即梦AI: 'tool-saas-jimeng',
  Runway: 'tool-saas-runway',
  ElevenLabs: 'tool-ext-elevenlabs',
  飞书妙记: 'tool-ext-t1fd65bfeda',
  Cursor: 'tool-saas-cursor',
  通义灵码: 'tool-ext-t03d8f35876',
  '扣子 Coze': 'tool-ext--coze',
  Gemini: 'tool-saas-gemini',
  Grok: 'tool-ext-grok',
  豆包: 'tool-saas-doubao',
  Qwen: 'tool-saas-tongyi',
  纳米AI: 'tool-ext-ai',
  得到大脑: 'tool-ext-t8563e24dc0',
  Grammarly: 'tool-ext-grammarly',
  'Beautiful.ai': 'tool-ext-beautiful-ai',
  'WPS AI': 'tool-ext-wps-ai',
  讯飞智文: 'tool-ext-te06e975987',
  'Qwen Image': 'tool-saas-tongyi-2',
  可灵AI: 'tool-saas-kling',
  'Google Flow / Veo': 'tool-ext-google-flow-veo',
  HeyGen: 'tool-ext-heygen',
  Suno: 'tool-ext-suno',
  Mureka: 'tool-ext-mureka',
  'Otter.ai': 'tool-ext-otter-ai',
  'Zoom AI Companion': 'tool-ext-zoom-ai-companion',
  '腾讯会议 AI': 'tool-ext--ai',
  通义听悟: 'tool-ext-t13eee22e20',
  WorkBuddy: 'tool-saas-workbuddy',
  Codex: 'tool-ext-codex',
  'Claude Code': 'tool-saas-claude-code',
  'GitHub Copilot': 'tool-saas-copilot',
  TRAE: 'tool-saas-trae',
  '腾讯 CodeBuddy': 'tool-ext--codebuddy',
  Dify: 'tool-ext-dify',
  Synthesia: 'tool-ext-synthesia',
  'Fireflies.ai': 'tool-ext-fireflies-ai',
  ima: 'tool-ext-ima',
  'Meta AI': 'tool-ext-meta-ai',
  腾讯元宝: 'tool-saas-yuanbao',
  天工AI: 'tool-ext-ai-3',
  Obsidian: 'tool-ext-obsidian',
  AiPPT: 'tool-ext-aippt',
  'ChatGPT Images 2.0': 'tool-saas-chatgpt-2',
  'Nano Banana 2': 'tool-ext-nano-banana-2',
  'FLUX.2': 'tool-saas-flux',
  LiblibAI: 'tool-ext-liblibai',
  海螺AI: 'tool-ext-ai-8',
  通义万相视频: 'tool-saas-wanxiang',
  'MiniMax Audio': 'tool-ext-minimax-audio',
  CosyVoice: 'tool-ext-cosyvoice',
  钉钉闪记: 'tool-ext-tf7ed573b17',
  讯飞听见: 'tool-ext-t0956c4653b',
  Windsurf: 'tool-saas-windsurf',
  CodeGeeX: 'tool-ext-codegeex',
  OpenClaw: 'tool-ext-openclaw',
  'Hermes Agent': 'tool-ext-hermes-agent',
  Genspark: 'tool-ext-genspark',
  Manus: 'tool-ext-manus',
  'Qwen Work': 'tool-excel-qwen-work',
  'Trae Work': 'tool-excel-trae-work',
  'Kimi Work': 'tool-excel-kimi-work',
  LibTV: 'tool-excel-libtv',
  'Stable Diffusion': 'tool-excel-stable-diffusion',
};

function text(value) {
  return value == null ? '' : String(value).replace(/\r\n?/g, '\n').trim();
}

function number(value, fallback = 0) {
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitList(value) {
  return text(value)
    .split(/[;；、\n]+/)
    .map((item) => item.replace(/^\s*[-•●]\s*/, '').trim())
    .filter(Boolean);
}

function splitGuide(value) {
  return text(value)
    .split('\n')
    .map((item) => item.replace(/^\s*\d+[.、)]\s*/, '').trim())
    .filter(Boolean);
}

function key(value) {
  return text(value).normalize('NFKC').toLocaleLowerCase();
}

function slug(value) {
  const ascii = text(value)
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `hash-${createHash('sha1').update(text(value)).digest('hex').slice(0, 12)}`;
}

function uniqueId(prefix, name, used) {
  const base = `${prefix}-${slug(name)}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

function rows(workbook, sheetName, headerRow) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`缺少工作表：${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, {
    range: headerRow - 1,
    defval: '',
    raw: false,
  }).filter((row) => Object.values(row).some((value) => text(value)));
}

function parseExternal(workbook) {
  const sourceRows = rows(workbook, '工具目录', 1);
  const grouped = new Map();
  const usedIds = new Set();

  for (const row of sourceRows) {
    const name = text(row['产品名']);
    if (!name) continue;
    const groupKey = key(name);
    const typeLabel = text(row['工具类型']);
    const typeId = TYPE_MAP[typeLabel] || 'general';
    const rank = number(row['排序'], Number.MAX_SAFE_INTEGER);
    const sequence = number(row['序号'], Number.MAX_SAFE_INTEGER);
    const current = grouped.get(groupKey);
    if (!current) {
      const stableId = EXTERNAL_ID[name];
      const id = stableId && !usedIds.has(stableId) ? stableId : uniqueId('tool-ext', name, usedIds);
      usedIds.add(id);
      grouped.set(groupKey, {
        id,
        name,
        company: text(row['公司']),
        region: text(row['区域']) === '海外' ? 'overseas' : 'domestic',
        toolTypeId: typeId,
        toolTypeIds: [typeId],
        toolTypeLabels: typeLabel ? [typeLabel] : [],
        externalCategoryRanks: { [typeId]: rank },
        externalSortOrder: sequence,
        externalSortRank: rank,
        cardSummary: text(row['卡片核心作用']),
        productIntro: text(row['产品详细介绍']),
        bestFor: text(row['最适合']),
        coreCapabilities: splitList(row['核心能力']),
        homepageUrl: text(row['访问链接']),
        ...(text(row['官方帮助文档']) ? { docsUrl: text(row['官方帮助文档']) } : {}),
        ...(text(row['官方介绍/演示']) ? { mediaUrl: text(row['官方介绍/演示']) } : {}),
        icon: TYPE_ICON[typeId] || TYPE_ICON.general,
      });
      continue;
    }

    if (!current.toolTypeIds.includes(typeId)) current.toolTypeIds.push(typeId);
    if (typeLabel && !current.toolTypeLabels.includes(typeLabel)) current.toolTypeLabels.push(typeLabel);
    current.externalCategoryRanks[typeId] = Math.min(current.externalCategoryRanks[typeId] ?? rank, rank);
    current.externalSortOrder = Math.min(current.externalSortOrder, sequence);
    current.externalSortRank = Math.min(current.externalSortRank, rank);
  }

  return [...grouped.values()]
    .sort((a, b) => a.externalSortOrder - b.externalSortOrder || a.name.localeCompare(b.name, 'zh'))
    .map((tool) => ({
      ...tool,
      desc: tool.cardSummary,
      category: 'external',
      author: tool.company,
      published: true,
      invokes: 0,
      tags: ['ai-saas', ...tool.toolTypeLabels],
      sourceType: 'external',
      visibility: 'public',
      ownerDeptIds: [],
      ownerRegionId: null,
      marketShelf: 'external',
    }));
}

function parseInternal(workbook) {
  const sourceRows = rows(workbook, '内部工具', 3);
  const usedIds = new Set();
  return sourceRows.map((row) => {
    const name = text(row['产品名']);
    const id = INTERNAL_ID[name] || uniqueId('tool-hw', name, usedIds);
    usedIds.add(id);
    const cardSummary = text(row['卡片核心作用']);
    return {
      id,
      name,
      cardSummary,
      productIntro: text(row['产品详细介绍']),
      coreCapabilities: splitList(row['核心能力']),
      usageGuide: splitGuide(row['站内使用指导']),
      homepageUrl: text(row['立即体验链接']),
      docsUrl: text(row['使用指导内容链接']),
      bestFor: text(row['适用场景']),
      icon: INTERNAL_ICON[name] || 'fa-cube',
      ...(INTERNAL_LOGO[name] ? { logoUrl: INTERNAL_LOGO[name] } : {}),
      desc: cardSummary,
      category: 'platform',
      author: '华为内部',
      published: true,
      invokes: 0,
      tags: ['hw-internal'],
      sourceType: 'internal',
      visibility: 'public',
      ownerDeptIds: [],
      ownerRegionId: null,
      marketShelf: 'internal',
    };
  });
}

function parseScenes(workbook, internalTools) {
  const sourceRows = rows(workbook, '内部场景', 3);
  const toolByName = new Map(internalTools.map((tool) => [key(tool.name), tool.id]));
  return sourceRows.map((row, index) => ({
    id: `scene-${String(index + 1).padStart(2, '0')}`,
    scene: text(row['场景']),
    nameExtension: text(row['名称扩展']),
    cardSummary: text(row['卡片核心作用']),
    toolName: text(row['对应工具']),
    toolIds: text(row['对应工具'])
      .split(/[、,，/]+/)
      .map((name) => toolByName.get(key(name)))
      .filter(Boolean),
    coreCapabilities: splitList(row['核心能力']),
    examplePrompt: text(row['示例指令']),
    experienceLogic: text(row['立即体验逻辑']),
  }));
}

function buildPayload(input) {
  const workbook = XLSX.readFile(input, { cellDates: false });
  const internalTools = parseInternal(workbook);
  const externalTools = parseExternal(workbook);
  const internalScenes = parseScenes(workbook, internalTools);
  if (externalTools.length !== 73) throw new Error(`外部工具合并结果异常：${externalTools.length}，预期 73`);
  if (internalTools.length !== 4) throw new Error(`内部工具数量异常：${internalTools.length}，预期 4`);
  if (internalScenes.length !== 9) throw new Error(`内部场景数量异常：${internalScenes.length}，预期 9`);
  for (const [name, logoUrl] of Object.entries(INTERNAL_LOGO)) {
    if (internalTools.find((tool) => tool.name === name)?.logoUrl !== logoUrl) {
      throw new Error(`内部工具 Logo 异常：${name}`);
    }
    if (!existsSync(new URL(`../apps/web/public${logoUrl}`, import.meta.url))) {
      throw new Error(`内部工具 Logo 文件不存在：${logoUrl}`);
    }
  }
  return {
    schemaVersion: 1,
    source: { file: basename(input), version: '1.0.5' },
    external: { version: '1.0.5', tools: externalTools },
    internal: { version: '1.0.5', tools: internalTools, scenes: internalScenes },
  };
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const apiKey = process.env.MSSCLAW_API_KEY || process.env.API_KEY;
  if (apiKey) headers['x-api-key'] = apiKey;
  const response = await fetch(url, { ...options, headers });
  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    throw new Error(`${options.method || 'GET'} ${url} 返回非 JSON：${body.slice(0, 200)}`);
  }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url} 失败 ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function applyToApi(payload, apiBase) {
  const url = `${apiBase}/tools`;
  const current = await request(url);
  if (!current || typeof current !== 'object') throw new Error('全局工具目录响应异常');
  if (!Array.isArray(current.tools)) throw new Error('全局工具目录响应缺少 tools 数组');
  const currentTools = current.tools;
  // 旧 workspace 数据迁移得到 initialized=false；只有真正 PUT 过全局目录
  // 才跳过，避免迁移快照让首次 Excel 初始化失效。
  const initialized =
    current.initialized === true ||
    Boolean(current.initializedAt) ||
    (currentTools.length > 0 && !current.migratedAt);
  if (initialized) {
    console.log(`global: tools=${currentTools.length}，已初始化，跳过`);
    return;
  }
  const tools = [...payload.external.tools, ...payload.internal.tools];
  await request(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tools,
      externalCatalogVersion: payload.external.version,
      internalCatalogVersion: payload.internal.version,
    }),
  });
  const verify = await request(url);
  if (!Array.isArray(verify?.tools) || verify.tools.length !== tools.length || verify.initialized !== true) {
    throw new Error('全局工具目录回读数量或 initialized 标记异常');
  }
  console.log(`global: tools=${verify.tools.length}, external=${payload.external.tools.length}, internal=${payload.internal.tools.length}`);
}

function args(argv) {
  const result = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, api: DEFAULT_API, apply: false, format: 'split' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') result.input = resolve(argv[++index]);
    else if (arg === '--output') result.output = resolve(argv[++index]);
    else if (arg === '--api') result.api = argv[++index].replace(/\/$/, '');
    else if (arg === '--apply') result.apply = true;
    else if (arg === '--format') result.format = argv[++index];
    else if (arg === '--help' || arg === '-h') {
      console.log('用法：node scripts/init-tool-data.mjs [--input file.xlsx] [--output file.json] [--format split|marketplace] [--apply] [--api URL]');
      process.exit(0);
    } else throw new Error(`未知参数：${arg}`);
  }
  if (!['split', 'marketplace'].includes(result.format)) throw new Error(`不支持的输出格式：${result.format}`);
  return result;
}

const options = args(process.argv.slice(2));
const payload = buildPayload(options.input);
const output = options.format === 'marketplace'
  ? { source: payload.source, tools: [...payload.external.tools, ...payload.internal.tools] }
  : payload;
await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`写入 ${options.output}: external=${payload.external.tools.length}, internal=${payload.internal.tools.length}, scenes=${payload.internal.scenes.length}`);
if (options.apply) await applyToApi(payload, options.api);
