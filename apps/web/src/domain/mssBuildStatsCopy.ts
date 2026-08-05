/**
 * MSS 工具集市 · 建设概况口径文案（运营可配）
 * 数字仍由列表实时推导；此处只解释「统计含义 / 建设目标」。
 */

export type MssBuildStatsCopy = {
  /** 统计条标题，默认「建设概况」 */
  title: string;
  /** 覆盖口径说明（展示在统计条下方或 tip） */
  coverageBlurb: string;
  /** 建设目标短句（可选） */
  goalBlurb: string;
};

export const DEFAULT_MSS_BUILD_STATS_COPY: MssBuildStatsCopy = {
  title: '建设概况',
  coverageBlurb:
    '数字随左侧领域/区域与当前场景筛选变化。「案例」为已上架场景案例；「场景有内容」表示该业务场景下至少有一个案例。',
  goalBlurb: '目标：各业务场景均有可复用的场景案例与场景技能。',
};
