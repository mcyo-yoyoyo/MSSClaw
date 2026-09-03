type CaseIntentRule = {
  demand: RegExp;
  caseEvidence: RegExp;
};

const CASE_INTENT_RULES: CaseIntentRule[] = [
  {
    demand: /视频|录屏|剪辑|配音|成片|宣传片|短片|短视频|文生视频|图生视频/,
    caseEvidence: /生成视频|视频生成|制作视频|视频制作|剪辑视频|视频剪辑|宣传片|短片|短视频|文生视频|图生视频|数字人视频|广告片/,
  },
  {
    demand: /图片|图像|出图|海报|视觉素材|生图/,
    caseEvidence: /生成图片|图片生成|生成图像|图像生成|出图|海报|视觉素材|生图/,
  },
  {
    demand: /语音|音频|配音|播客/,
    caseEvidence: /语音生成|生成语音|音频生成|生成音频|配音|播客制作|语音合成/,
  },
  {
    demand: /sell\s*out|psi|销量预测|销售预测|需求预测|库存预测/,
    caseEvidence: /sell\s*out|psi|销量预测|销售预测|需求预测|库存预测/,
  },
  {
    demand: /评论分析|用户评论|用户声音|情感分析|舆情|\bvoc\b/i,
    caseEvidence: /评论分析|用户评论|用户声音|情感分析|舆情|\bvoc\b/i,
  },
  {
    demand: /翻译|多语言|本地化/,
    caseEvidence: /翻译|多语言|本地化/,
  },
];

export function matchesRequiredCaseIntent(demandText: string, caseText: string): boolean {
  const normalizedDemand = demandText.toLowerCase();
  const requiredIntent = CASE_INTENT_RULES.find((rule) => rule.demand.test(normalizedDemand));
  if (!requiredIntent) return true;
  return requiredIntent.caseEvidence.test(caseText.toLowerCase());
}
