import type { PrototypeWorkspace } from '@/domain/prototype/types';

/** 来源：index.html WORKSPACES */
export const PROTOTYPE_WORKSPACES: Record<string, PrototypeWorkspace> = {
  'ws-cn-marketing': { id: 'ws-cn-marketing', label: '机关全球营销运营视角', short: '机关营销' },
  'ws-oversea-channel': { id: 'ws-oversea-channel', label: '海外一线渠道视角', short: '海外渠道' },
  'ws-service-ops': { id: 'ws-service-ops', label: '机关全球服务运营视角', short: '服务运营' },
};
