/**
 * 搜索词只保留 SkillHub V5 受控细词条。
 * 调用指令和自由英文词不再进入关键词。
 */
import { recognizeSkillHubTags, skillHubSearchTerms } from './skillHubTags.ts';

/** 从中英文名称、描述、正文抽取受控搜索词 */
export function suggestSkillSearchKeywords(input: {
  nameZh?: string;
  nameEn?: string;
  descZh?: string;
  descEn?: string;
  instructions?: string;
  command?: string;
  existingTags?: string[];
}): string[] {
  return skillHubSearchTerms(
    recognizeSkillHubTags({
      nameZh: input.nameZh,
      nameEn: input.nameEn,
      descZh: input.descZh,
      descEn: input.descEn,
      instructions: input.instructions,
    }),
  );
}
