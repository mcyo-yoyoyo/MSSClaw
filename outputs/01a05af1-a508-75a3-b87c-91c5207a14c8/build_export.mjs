import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const ROOT = '/Users/project/MSSClaw';
const OUT_DIR = `${ROOT}/outputs/01a05af1-a508-75a3-b87c-91c5207a14c8`;
const TARGET_WORKSPACE_ID = 'ws-cn-marketing';
const OUTPUT_XLSX = `${OUT_DIR}/mssclaw-skills-agents-${TARGET_WORKSPACE_ID}.xlsx`;

const db = JSON.parse(await fs.readFile(`${OUT_DIR}/db-assets.json`, 'utf8'));
const workspace = db.workspaces.find((item) => item.id === TARGET_WORKSPACE_ID) ?? {
  id: TARGET_WORKSPACE_ID,
  name: TARGET_WORKSPACE_ID,
};
const marketplace = db.marketplace.filter((item) => item.workspaceId === TARGET_WORKSPACE_ID);
const skills = marketplace.filter((item) => item.kind === 'skill');
const agents = marketplace.filter((item) => item.kind === 'agent');
const engagement = new Map(
  db.engagement
    .filter((item) => item.workspaceId === TARGET_WORKSPACE_ID)
    .map((item) => [item.contentId, item]),
);

const categoryLabels = {
  office: '办公提效',
  manage: '管理提效',
  process: '流程提效',
  experience: '体验提升',
};
const scenarioLabels = {
  S1: '市场洞察',
  S2: '内容生成',
  S3: '销售赋能',
  S4: '合规结算',
  S5: '客户服务',
  S6: '知识问答',
  S7: '日常办公',
  S8: '数据分析',
};
const deptLabels = {
  gtm: 'GTM',
  mkt: 'MKT',
  ecommerce: '电商',
  service: '服务',
  channel: '渠道',
  retail: '零售',
  hr: 'HR',
  quality: '质运',
  finance: '财经',
};
const regionLabels = {
  hq: '机关',
  china: '中国区',
  apac: '亚太',
  mea: '中东非',
  latam: '拉美',
  europe: '欧洲',
  eurasia: '欧亚',
};
const visibilityLabels = {
  public: '公开可见',
  org: '组织内',
  private: '仅发布方',
};

function text(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean).join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function dateText(value) {
  if (value === null || value === undefined || value === '') return '';
  // Zero-width prefix keeps ISO timestamps as text without changing what users see.
  return `\u200B${String(value)}`;
}

function json(value) {
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}

function bool(value) {
  return typeof value === 'boolean' ? (value ? '是' : '否') : '';
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function labels(values, dictionary) {
  if (!Array.isArray(values)) return '';
  return values.map((value) => dictionary[value] ?? value).join('、');
}

function packageMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const p = value;
  return json({
    id: p.id,
    name: p.name,
    size: p.size,
    uploadedAt: p.uploadedAt,
  });
}

function metrics(id) {
  const e = engagement.get(id);
  return {
    record: e ? '是' : '否',
    views: number(e?.views),
    uses: number(e?.uses),
    likes: number(e?.likes),
    dislikes: number(e?.dislikes),
    downloads: number(e?.downloads),
    favorites: number(e?.favorites),
    updatedAt: e?.updatedAt ? new Date(Number(e.updatedAt)).toISOString() : '',
  };
}

function skillRows() {
  return skills.map((entry, index) => {
    const p = entry.payload ?? {};
    const m = metrics(entry.id);
    const callableFrom = typeof p.callable === 'boolean' ? '原始 callable' : '按 published 兼容回填';
    return [
      index + 1,
      text(p.id ?? entry.id),
      text(p.nameZh ?? p.name),
      text(p.nameEn),
      categoryLabels[p.category] ?? text(p.category),
      text(p.businessScenarioId),
      scenarioLabels[p.businessScenarioId] ?? '',
      text(p.command),
      text(p.version),
      text(p.author),
      text(p.publisher),
      text(p.publisherUserId),
      dateText(p.createdAt),
      dateText(p.updatedAt),
      text(p.updatedBy),
      visibilityLabels[p.visibility] ?? text(p.visibility),
      text(p.sourceType),
      bool(p.published),
      typeof p.callable === 'boolean' ? bool(p.callable) : bool(p.published),
      callableFrom,
      p.featuredInMssMarket === undefined ? bool(p.featuredInDoTask) : bool(p.featuredInMssMarket),
      number(p.invokes),
      m.record,
      m.views,
      m.uses,
      m.likes,
      m.dislikes,
      m.downloads,
      m.favorites,
      dateText(m.updatedAt),
      text(p.connector),
      text(p.icon),
      text(p.accentColor),
      text(p.tags),
      text(p.searchKeywords),
      entry.recordUpdatedAt ? dateText(new Date(Number(entry.recordUpdatedAt)).toISOString()) : '',
    ];
  });
}

function skillConfigRows() {
  return skills.map((entry) => {
    const p = entry.payload ?? {};
    return [
      text(p.id ?? entry.id),
      text(p.nameZh ?? p.name),
      text(p.descZh ?? p.desc),
      labels(p.ownerDeptIds, deptLabels),
      text(p.ownerDeptIds),
      p.ownerRegionId ? `${regionLabels[p.ownerRegionId] ?? p.ownerRegionId} (${p.ownerRegionId})` : '',
      labels(p.ownerRegionIds, regionLabels),
      text(p.scenarioTags),
      text(p.planSteps),
      Array.isArray(p.cases) ? p.cases.length : 0,
      json(p.cases),
      text(p.usageNotes),
      text(p.instructions),
      packageMeta(p.packageBlob),
      json(p),
    ];
  });
}

function agentRows() {
  return agents.map((entry, index) => {
    const p = entry.payload ?? {};
    const m = metrics(entry.id);
    const skillIds = Array.isArray(p.skillIds) ? p.skillIds : [];
    return [
      index + 1,
      text(p.id ?? entry.id),
      text(p.name),
      categoryLabels[p.category] ?? text(p.category),
      text(p.bizLine),
      text(p.homeTag),
      text(p.businessScenarioId),
      scenarioLabels[p.businessScenarioId] ?? '',
      text(p.author),
      text(p.publisher),
      text(p.publisherUserId),
      dateText(p.updatedAt),
      visibilityLabels[p.visibility] ?? text(p.visibility),
      text(p.sourceType),
      bool(p.published),
      bool(p.featuredInDoTask),
      number(p.invokes),
      m.record,
      m.views,
      m.uses,
      m.likes,
      m.dislikes,
      m.downloads,
      m.favorites,
      dateText(m.updatedAt),
      text(p.primarySkillId),
      skillIds.length,
      text(p.chatId),
      text(p.icon),
      text(p.color),
      text(p.avatarPresetId),
      entry.recordUpdatedAt ? dateText(new Date(Number(entry.recordUpdatedAt)).toISOString()) : '',
    ];
  });
}

function agentConfigRows() {
  const skillNameById = new Map(skills.map((entry) => [entry.id, text(entry.payload?.nameZh ?? entry.payload?.name)]));
  return agents.map((entry) => {
    const p = entry.payload ?? {};
    const skillIds = Array.isArray(p.skillIds) ? p.skillIds : [];
    return [
      text(p.id ?? entry.id),
      text(p.name),
      text(p.desc),
      text(p.systemPrompt),
      text(p.demoPrompt),
      text(p.planSteps),
      text(skillIds),
      skillIds.map((id) => skillNameById.get(id) ?? id).join('、'),
      text(p.primarySkillId),
      text(p.ownerDeptIds),
      labels(p.ownerDeptIds, deptLabels),
      text(p.ownerRegionIds),
      labels(p.ownerRegionIds, regionLabels),
      text(p.scenarioTags),
      visibilityLabels[p.visibility] ?? text(p.visibility),
      text(p.avatarUrl),
      packageMeta(p.packageBlob),
      json(p),
    ];
  });
}

function relationRows() {
  const skillNameById = new Map(skills.map((entry) => [entry.id, text(entry.payload?.nameZh ?? entry.payload?.name)]));
  const rows = [];
  for (const agentEntry of agents) {
    const p = agentEntry.payload ?? {};
    const ids = Array.isArray(p.skillIds) ? p.skillIds : [];
    ids.forEach((skillId, i) => {
      rows.push([
        rows.length + 1,
        text(agentEntry.id),
        text(p.name),
        i + 1,
        text(skillId),
        skillNameById.get(skillId) ?? '',
        p.primarySkillId === skillId ? '是' : '否',
        skillNameById.has(skillId) ? '是' : '否',
        'marketplace.skillIds',
      ]);
    });
  }
  return rows;
}

function colLetter(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function styleRange(range, style) {
  try {
    range.format = style;
  } catch {
    // Keep the workbook usable if a nonessential style attribute is unsupported.
  }
}

function writeDataSheet(workbook, name, title, note, headers, rows, widths, longColumns = []) {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const lastCol = colLetter(headers.length - 1);
  sheet.mergeCells(`A1:${lastCol}1`);
  sheet.getRange('A1').values = [[title]];
  sheet.mergeCells(`A2:${lastCol}2`);
  sheet.getRange('A2').values = [[note]];
  sheet.getRangeByIndexes(3, 0, 1, headers.length).values = [headers];
  if (rows.length) {
    sheet.getRangeByIndexes(4, 0, rows.length, headers.length).values = rows;
  }
  styleRange(sheet.getRange(`A1:${lastCol}1`), {
    fill: '#111827',
    font: { bold: true, color: '#FFFFFF', size: 15 },
    verticalAlignment: 'center',
  });
  styleRange(sheet.getRange(`A2:${lastCol}2`), {
    fill: '#F3F4F6',
    font: { color: '#4B5563', italic: true, size: 10 },
    wrapText: true,
    verticalAlignment: 'center',
  });
  styleRange(sheet.getRange(`A4:${lastCol}4`), {
    fill: '#B91C1C',
    font: { bold: true, color: '#FFFFFF', size: 10 },
    wrapText: true,
    verticalAlignment: 'center',
    horizontalAlignment: 'center',
  });
  if (rows.length) {
    styleRange(sheet.getRange(`A5:${lastCol}${4 + rows.length}`), {
      verticalAlignment: 'top',
      wrapText: false,
    });
    for (const index of longColumns) {
      styleRange(sheet.getRangeByIndexes(4, index, rows.length, 1), { wrapText: true, verticalAlignment: 'top' });
    }
    try {
      const table = sheet.tables.add(`A4:${lastCol}${4 + rows.length}`, true, `${name.replace(/[^A-Za-z0-9]/g, '')}Table`);
      table.style = 'TableStyleMedium2';
      table.showFilterButton = true;
    } catch {
      // A table is an enhancement; plain filtered-looking rows remain readable.
    }
  }
  sheet.getRange(`A1:${lastCol}1`).format.rowHeight = 28;
  sheet.getRange(`A2:${lastCol}2`).format.rowHeight = 32;
  sheet.getRange(`A4:${lastCol}4`).format.rowHeight = 32;
  if (rows.length) sheet.getRange(`A5:${lastCol}${4 + rows.length}`).format.rowHeight = name.includes('配置') ? 82 : 24;
  widths.forEach((width, index) => {
    const rowCount = Math.max(rows.length + 4, 5);
    sheet.getRangeByIndexes(0, index, rowCount, 1).format.columnWidth = width;
  });
  sheet.freezePanes.freezeRows(4);
  return sheet;
}

const skillHeaders = [
  '序号', 'Skill ID', '名称', '英文名称', '分类', '业务场景ID', '业务场景', '调用指令', '版本', '作者',
  '发布者', '发布者ID', '创建时间', '更新时间', '更新者', '可见范围', '来源类型', '已发布', '可调用',
  '可调用字段来源', '精选', '调用次数', '互动记录', '浏览量', '使用次数', '点赞', '点踩', '下载', '收藏',
  '互动更新时间', '连接器', '图标', '边线色', '标签', '搜索关键词', '市场快照更新时间',
];
const skillConfigHeaders = [
  'Skill ID', '名称', '描述', '归属部门ID', '归属部门', '主区域', '多区域', '场景标签', '计划步骤', '案例数',
  '案例详情(JSON)', '使用须知', '执行正文', '包元数据(JSON)', '原始 JSON',
];
const agentHeaders = [
  '序号', 'Agent ID', '名称', '分类', '业务线', '首页标签', '业务场景ID', '业务场景', '作者', '发布者',
  '发布者ID', '更新时间', '可见范围', '来源类型', '已发布', '精选', '调用次数', '互动记录', '浏览量', '使用次数',
  '点赞', '点踩', '下载', '收藏', '互动更新时间', '主Skill ID', '挂载Skill数', '聊天入口', '图标', '颜色',
  '头像预设', '市场快照更新时间',
];
const agentConfigHeaders = [
  'Agent ID', '名称', '简介', 'System Prompt / Persona', '演示任务', '计划步骤', '挂载Skill ID', '挂载Skill名称',
  '主Skill ID', '归属部门ID', '归属部门', '归属区域ID', '归属区域', '场景标签', '可见范围', '头像URL',
  '包元数据(JSON)', '原始 JSON',
];
const relationHeaders = [
  '序号', 'Agent ID', 'Agent名称', 'Skill序号', 'Skill ID', 'Skill名称', '是否主Skill', 'Skill在当前快照', '关系来源',
];

const skillData = skillRows();
const skillConfigData = skillConfigRows();
const agentData = agentRows();
const agentConfigData = agentConfigRows();
const relationData = relationRows();

const workbook = Workbook.create();

const summary = workbook.worksheets.add('汇总');
summary.showGridLines = false;
summary.mergeCells('A1:H1');
summary.getRange('A1').values = [['MSSClaw Skill / Agent 数据导出']];
summary.mergeCells('A2:H2');
summary.getRange('A2').values = [[`范围：${workspace.name || TARGET_WORKSPACE_ID}（${TARGET_WORKSPACE_ID}）· 来源：运行时 marketplace 快照 · 空白字段表示源数据未提供`]];
styleRange(summary.getRange('A1:H1'), { fill: '#111827', font: { bold: true, color: '#FFFFFF', size: 16 }, verticalAlignment: 'center' });
styleRange(summary.getRange('A2:H2'), { fill: '#F3F4F6', font: { color: '#4B5563', italic: true, size: 10 }, wrapText: true });
summary.getRange('A1:H1').format.rowHeight = 30;
summary.getRange('A2:H2').format.rowHeight = 32;

const summaryHeaders = ['指标', '值', '说明'];
const summaryRows = [
  ['导出时间', dateText(db.generatedAt), '生成本工作簿时的时间（UTC）'],
  ['工作区 ID', TARGET_WORKSPACE_ID, '仅导出当前运行时工作区，避免跨工作区混合'],
  ['数据源', 'CenterRecord.kind=marketplace', '后端 marketplace 是前台集市运行时权威快照'],
  ['Skill 数量', null, '市场快照中的 Skill 条目'],
  ['Agent 数量', null, '市场快照中的 Agent 条目'],
  ['Agent-Skill 关系数', null, '每个 Agent 挂载一个 Skill 计一行'],
  ['已发布 Skill', null, '已发布字段为“是”'],
  ['可调用 Skill', null, '缺少 callable 时按 published 兼容回填'],
  ['精选 Skill', null, 'featuredInMssMarket / featuredInDoTask'],
  ['已发布 Agent', null, '已发布字段为“是”'],
  ['Skill 演示调用总次数', null, 'marketplace invokes 字段求和'],
  ['Agent 演示调用总次数', null, 'marketplace invokes 字段求和'],
  ['互动浏览量合计', null, 'MarketEngagement 聚合表；无记录时为 0'],
  ['互动使用次数合计', null, 'MarketEngagement 聚合表；无记录时为 0'],
  ['互动下载量合计', null, 'MarketEngagement 聚合表；无记录时为 0'],
];
summary.getRange('A4:C19').values = [summaryHeaders, ...summaryRows];
styleRange(summary.getRange('A4:C4'), { fill: '#B91C1C', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' });
styleRange(summary.getRange('A5:C19'), { verticalAlignment: 'top', wrapText: true });
summary.getRange('A4:C19').format.rowHeight = 24;
summary.getRange('A4:C4').format.rowHeight = 28;

const skillEnd = 4 + skillData.length;
const agentEnd = 4 + agentData.length;
const relationEnd = 4 + relationData.length;
const formulaValues = [
  [`=COUNTA('Skill清单'!B5:B${skillEnd})`],
  [`=COUNTA('Agent清单'!B5:B${agentEnd})`],
  [`=COUNTA('Agent-Skill关系'!B5:B${relationEnd})`],
  [`=COUNTIF('Skill清单'!R5:R${skillEnd},"是")`],
  [`=COUNTIF('Skill清单'!S5:S${skillEnd},"是")`],
  [`=COUNTIF('Skill清单'!U5:U${skillEnd},"是")`],
  [`=COUNTIF('Agent清单'!O5:O${agentEnd},"是")`],
  [`=SUM('Skill清单'!V5:V${skillEnd})`],
  [`=SUM('Agent清单'!Q5:Q${agentEnd})`],
  [`=SUM('Skill清单'!X5:X${skillEnd})+SUM('Agent清单'!S5:S${agentEnd})`],
  [`=SUM('Skill清单'!Y5:Y${skillEnd})+SUM('Agent清单'!T5:T${agentEnd})`],
  [`=SUM('Skill清单'!AB5:AB${skillEnd})+SUM('Agent清单'!W5:W${agentEnd})`],
];
summary.getRange('B5:B7').format.numberFormat = '@';
summary.getRange('B8:B19').format.numberFormat = '#,##0';

summary.getRange('E4:H4').values = [['分类', 'Skill 数量', 'Agent 数量', 'Skill 调用次数']];
const categoryRows = Object.entries(categoryLabels).map(([id, label]) => [label, null, null, null]);
summary.getRange('E5:H8').values = categoryRows;
styleRange(summary.getRange('E4:H4'), { fill: '#B91C1C', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' });
styleRange(summary.getRange('E5:H8'), { verticalAlignment: 'center' });
summary.getRange('F5:H8').format.numberFormat = '#,##0';
summary.mergeCells('E11:H14');
summary.getRange('E11').values = [[
  '边界说明：本次只读取当前工作区 marketplace 快照；未混入其他工作区、过期 CenterRecord 投影或历史静态原型。互动指标来自 MarketEngagement 聚合表；原始 JSON 放在明细配置页末列，包仅导出元数据。',
]];
styleRange(summary.getRange('E11:H14'), { fill: '#FEF3C7', font: { color: '#92400E', size: 10 }, wrapText: true, verticalAlignment: 'top' });
summary.getRange('E11:H14').format.rowHeight = 22;
for (const [col, width] of Object.entries({ A: 24, B: 34, C: 46, D: 4, E: 18, F: 14, G: 14, H: 18 })) {
  summary.getRange(`${col}1:${col}19`).format.columnWidth = width;
}
summary.freezePanes.freezeRows(4);

writeDataSheet(
  workbook,
  'Skill清单',
  'Skill 明细 · 当前工作区 marketplace 快照',
  `工作区：${TARGET_WORKSPACE_ID} · 共 ${skillData.length} 条；互动字段来自 MarketEngagement 聚合表，0 不代表一定没有历史行为。`,
  skillHeaders,
  skillData,
  [7, 25, 20, 18, 12, 12, 14, 16, 12, 14, 14, 18, 13, 13, 13, 12, 12, 10, 10, 18, 10, 12, 10, 12, 12, 10, 10, 10, 10, 20, 24, 14, 12, 24, 26, 20],
  [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 20, 29, 33, 34],
);
writeDataSheet(
  workbook,
  'Skill配置',
  'Skill 配置与正文',
  '长文本按源数据保留；原始 JSON 位于最后一列，packageBlob 仅保留 id/name/size/uploadedAt。',
  skillConfigHeaders,
  skillConfigData,
  [25, 20, 56, 18, 18, 20, 20, 24, 48, 10, 48, 40, 72, 34, 72],
  [2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
);
writeDataSheet(
  workbook,
  'Agent清单',
  'Agent 明细 · 当前工作区 marketplace 快照',
  `工作区：${TARGET_WORKSPACE_ID} · 共 ${agentData.length} 条；Agent 的可调用状态以市场快照 published 为准。`,
  agentHeaders,
  agentData,
  [7, 25, 22, 12, 22, 14, 12, 14, 14, 14, 18, 13, 12, 12, 10, 10, 12, 10, 12, 12, 10, 10, 10, 10, 20, 24, 12, 14, 14, 24, 16, 20],
  [2, 4, 8, 9, 10, 11, 12, 13, 24, 25, 27, 28, 29, 30],
);
writeDataSheet(
  workbook,
  'Agent配置',
  'Agent 编排配置与提示词',
  '长文本按源数据保留；原始 JSON 位于最后一列，包仅保留元数据。',
  agentConfigHeaders,
  agentConfigData,
  [25, 22, 56, 72, 72, 48, 48, 48, 24, 18, 18, 22, 22, 28, 14, 42, 34, 72],
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16],
);
writeDataSheet(
  workbook,
  'Agent-Skill关系',
  'Agent 与 Skill 挂载关系（规范化一行一关系）',
  '关系来自 marketplace agent.skillIds；顺序为源数组顺序，主 Skill 由 primarySkillId 标记。',
  relationHeaders,
  relationData,
  [7, 25, 22, 12, 25, 24, 12, 16, 24],
  [2, 5],
);

// Write formulas after all referenced worksheets exist.
summary.getRange('B8:B19').formulas = formulaValues;
for (let i = 0; i < categoryRows.length; i += 1) {
  const row = 5 + i;
  summary.getRange(`F${row}:H${row}`).formulas = [[
    `=COUNTIF('Skill清单'!E5:E${skillEnd},E${row})`,
    `=COUNTIF('Agent清单'!D5:D${agentEnd},E${row})`,
    `=SUMIF('Skill清单'!E5:E${skillEnd},E${row},'Skill清单'!V5:V${skillEnd})`,
  ]];
}

await fs.mkdir(OUT_DIR, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(OUTPUT_XLSX);

const readbackWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(OUTPUT_XLSX));
const readback = await readbackWorkbook.inspect({
  kind: 'table',
  range: '汇总!A1:H19',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
});
console.log(`READBACK\\n${readback.ndjson}`);

const checks = {
  targetWorkspace: TARGET_WORKSPACE_ID,
  skills: skillData.length,
  agents: agentData.length,
  relations: relationData.length,
  output: OUTPUT_XLSX,
};
console.log(JSON.stringify(checks));

for (const sheet of ['汇总', 'Skill清单', 'Skill配置', 'Agent清单', 'Agent配置', 'Agent-Skill关系']) {
  const preview = await workbook.render({ sheetName: sheet, autoCrop: 'all', scale: 1, format: 'png' });
  await fs.writeFile(`${OUT_DIR}/${sheet}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const inspect = await workbook.inspect({
  kind: 'table',
  range: '汇总!A1:H19',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 10,
  tableMaxCellChars: 120,
});
console.log(inspect.ndjson);
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);
