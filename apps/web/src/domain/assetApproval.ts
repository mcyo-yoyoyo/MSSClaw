/** 能力沉淀资产审批：提交人 → 业务主管 → MSS 质量与运营 */

export type AssetApprovalKind =
  | 'agent'
  | 'skill'
  | 'tool'
  | 'kb'
  | 'automation'
  | 'portal';

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
    desc: '完成资产配置并提交上架 / 更新 / 下架申请',
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
  portal: 'AI 项目',
};

/** 审批事由 */
export type AssetApprovalReason =
  | 'publish_executable'
  | 'visibility_public'
  | 'update_version'
  | 'unpublish_skill';

export const ASSET_APPROVAL_REASON_LABELS: Record<AssetApprovalReason, string> = {
  // 保留历史 reason id，当前语义表示发布任意能力资产，不代表 callable 运营标记。
  publish_executable: '发布资产（终审后前台展示）',
  visibility_public: '公开可见（跨部门/领域）',
  update_version: '版本更新上架',
  // 保留历史 reason id；工具与 Skill 共用该下架审批事由。
  unpublish_skill: '下架资产（终审后前台隐藏）',
};

export type SkillUnpublishMode = 'all' | 'versions';

export interface AssetApprovalRequest {
  kind: AssetApprovalKind;
  assetId: string;
  assetName: string;
  submitterName: string;
  submitterUserId?: string;
  /** 0=提交人完成，1=待业务主管，2=待质量运营，3=全部通过 */
  stepIndex: number;
  createdAt: number;
  /** 审批事由；缺省视为发布资产（兼容旧调用） */
  reasons?: AssetApprovalReason[];
  /** 更新说明 / 下架理由等 */
  note?: string;
  /** 目标版本号（更新申请） */
  targetVersion?: string;
  /** 更新申请上传的完整 Skill 包；终审通过后写入 skill.packageBlob 并归档旧包 */
  packageName?: string;
  packageBlobId?: string;
  packageUrl?: string;
  packageSize?: number;
  /** 下架范围（MVP 以 all 为主；versions 预留） */
  unpublishMode?: SkillUnpublishMode;
  /** 指定下架的版本号列表（预留） */
  unpublishVersions?: string[];
}

export function approvalNodeStatuses(stepIndex: number): ApprovalNodeStatus[] {
  return ASSET_APPROVAL_NODES.map((_, i) => {
    if (i < stepIndex) return 'done';
    if (i === stepIndex) return 'active';
    return 'pending';
  });
}

export function approvalActionTitle(reasons?: AssetApprovalReason[]): string {
  if (reasons?.includes('unpublish_skill')) return '下架审批';
  if (reasons?.includes('update_version')) return '更新上架审批';
  return '上架审批';
}

export function approvalFinalCta(reasons?: AssetApprovalReason[]): string {
  if (reasons?.includes('unpublish_skill')) return '终审通过并下架';
  if (reasons?.includes('update_version')) return '终审通过并生效更新';
  return '终审通过并上架';
}
