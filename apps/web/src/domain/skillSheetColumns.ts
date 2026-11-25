/**
 * [INPUT]: 读取 Skill 目录和领域、区域、场景字典。
 * [OUTPUT]: 导出明细表的列顺序和字段文本。未选来源且无来源说明时留空。
 * [POS]: 运营 Excel 导出和导入比对共用同一字段定义。
 * [PROTOCOL]: Update this header on change, then check AGENTS.md
 */
import { assetCreatorName } from '@/domain/assetCreator';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { getSkillBusinessLabel, resolveSkillFeaturedInMssMarket } from '@/domain/skillBusinessScenarios';
import { skillDisplayName } from '@/domain/skillDisplay';
import { getSkillVisibilityLabel } from '@/domain/skillVisibility';

const SOURCE_LABELS = { internal: '内部平台', external: '外部平台' } as const;

export const SKILL_SHEET_COLUMNS = [
  'SkillID', 'Skill名称', '来源', '创建者', '所属部门预留', '匹配流程预留',
  '领域信息', '区域信息', '业务场景', '英文名称', '调用指令', '可见范围',
  '是否可调用', '是否精选推荐', '运营标签', '搜索关键词', '创建时间',
  '更新者', '更新时间', '最近更新日期', '历史版本更新记录', '具备执行正文',
  '使用须知摘要', '案例条数', '演示调用次数', '页面访问量', 'Skill下载总量',
  '近30天下载总量', '点赞量', '点赞用户名工号', '点踩量', '点踩用户名工号',
  '调用总次数预留', 'Token消耗总量预留', '近30天消耗总量预留',
] as const;

export function skillSheetMetadata(skill: PrototypeSkillSeed) {
  const regions = skill.ownerRegionIds?.length
    ? skill.ownerRegionIds
    : skill.ownerRegionId ? [skill.ownerRegionId] : [];
  const source = skill.sourceType && SOURCE_LABELS[skill.sourceType];
  return {
    Skill名称: skillDisplayName(skill),
    来源: skill.sourceLabel || source || '',
    创建者: assetCreatorName(skill),
    领域信息: (skill.ownerDeptIds ?? []).map(getDeptLabel).join('、'),
    区域信息: regions.map(getRegionLabel).join('、'),
    业务场景: getSkillBusinessLabel(skill) ?? '',
    英文名称: skill.nameEn ?? '',
    调用指令: skill.command,
    可见范围: getSkillVisibilityLabel(skill.visibility),
    是否可调用: (skill.callable ?? skill.published) ? '是' : '否',
    是否精选推荐: resolveSkillFeaturedInMssMarket(skill) ? '是' : '否',
    运营标签: (skill.tags ?? []).join('、'),
    搜索关键词: (skill.searchKeywords ?? []).join('、'),
    使用须知摘要: skill.usageNotes ?? '',
  };
}
