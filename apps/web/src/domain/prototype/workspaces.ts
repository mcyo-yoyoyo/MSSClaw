import type { PrototypeWorkspace } from '@/domain/prototype/types';

/** 来源：index.html WORKSPACES */
export const PROTOTYPE_WORKSPACES: Record<string, PrototypeWorkspace> = {
  'ws-cn-marketing': { id: 'ws-cn-marketing', label: '华为终端 · 中国区营销服', short: '中国区' },
  'ws-oversea-channel': { id: 'ws-oversea-channel', label: '海外渠道 · 拉美/EU', short: '海外渠道' },
  'ws-service-ops': { id: 'ws-service-ops', label: '消费者服务 · 售后运营', short: '消费者服务' },
};
