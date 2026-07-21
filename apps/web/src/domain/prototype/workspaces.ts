import type { PrototypeWorkspace } from '@/domain/prototype/types';
import { PROTOTYPE_WORKSPACE_ID } from '@/domain/prototype/constants';

/** 顶栏组织视角 · 六大战区数据空间 */
export const PROTOTYPE_WORKSPACES: Record<string, PrototypeWorkspace> = {
  [PROTOTYPE_WORKSPACE_ID]: {
    id: PROTOTYPE_WORKSPACE_ID,
    label: '华为全球营销服',
    short: '全球营销服',
  },
  'ws-apac': { id: 'ws-apac', label: '亚太地区部', short: '亚太' },
  'ws-3c-latam': { id: 'ws-3c-latam', label: '拉美地区部', short: '拉美' },
  'ws-mea': { id: 'ws-mea', label: '中东地区部', short: '中东' },
  'ws-eurasia': { id: 'ws-eurasia', label: '欧亚地区部', short: '欧亚' },
  'ws-europe': { id: 'ws-europe', label: '欧洲地区部', short: '欧洲' },
};
