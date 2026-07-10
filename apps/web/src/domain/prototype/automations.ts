import type { PrototypeAutomation } from '@/domain/prototype/types';

/** 来源：index.html DEFAULT_AUTOMATIONS */
export const PROTOTYPE_AUTOMATIONS: PrototypeAutomation[] = [
  { id: 'auto-meeting-daily', name: '会议纪要自动归档', desc: '每日 18:00 扫描 WeLink 会议录音，调用会议纪要 Agent 生成摘要并入库', agentId: 'agent-meeting', skillIds: ['skill-meeting-minutes', 'skill-file-archive'], schedule: '每日 18:00', enabled: true, lastRun: '昨天 18:05' },
  { id: 'auto-price-weekly', name: '价格监测周报', desc: '每周一汇总 18 国渠道 offer 监测结果，生成 GTM/电商调价建议', agentId: 'agent-price-monitor', skillIds: ['skill-price-monitor', 'skill-wecom'], schedule: '每周一 09:00', enabled: true, lastRun: '本周一 09:12' },
  { id: 'auto-resume-batch', name: 'HR 简历批量初筛', desc: '新入库 JD 自动触发简历筛选 Agent，输出人岗匹配 Top-N 清单', agentId: 'agent-hr-resume', skillIds: ['skill-jd-parser', 'skill-resume-screen'], schedule: '实时', enabled: false, lastRun: '3 天前' },
];
