/** 能力沉淀资产上架审批：提交人 → 业务主管 → MSS 质量与运营 */

export type AssetApprovalKind = 'agent' | 'skill' | 'tool' | 'kb' | 'automation';

export type ApprovalNodeStatus = 'done' | 'active' | 'pending' | 'rejected';

export interface ApprovalNodeDef {
  id: 'submitter' | 'biz_owner' | 'mss_qo';
  title: string;
  roleLabel: string;
  desc: string;
  icon: string;
}

export const ASSET_APPROVAL_NODES: ApprovalNodeDef[] = [
  {
    id: 'submitter',
    title: '提交人',
    roleLabel: '配置提交',
    desc: '完成资产配置并提交上架申请',
    icon: 'fa-user-pen',
  },
  {
    id: 'biz_owner',
    title: '业务主管审核',
    roleLabel: '业务主管',
    desc: '核对业务归属、场景适配与使用范围',
    icon: 'fa-user-tie',
  },
  {
    id: 'mss_qo',
    title: 'MSS 质量与运营审核',
    roleLabel: 'MSS 质量与运营',
    desc: '合规、质量与上架标准终审',
    icon: 'fa-shield-halved',
  },
];

export const ASSET_APPROVAL_KIND_LABELS: Record<AssetApprovalKind, string> = {
  agent: '专家',
  skill: '技能',
  tool: '工具',
  kb: '知识文档',
  automation: '自动化设置',
};

export interface AssetApprovalRequest {
  kind: AssetApprovalKind;
  assetId: string;
  assetName: string;
  submitterName: string;
  /** 0=提交人完成，1=待业务主管，2=待质量运营，3=全部通过 */
  stepIndex: number;
  createdAt: number;
}

export function approvalNodeStatuses(stepIndex: number): ApprovalNodeStatus[] {
  return ASSET_APPROVAL_NODES.map((_, i) => {
    if (i < stepIndex) return 'done';
    if (i === stepIndex) return 'active';
    return 'pending';
  });
}
