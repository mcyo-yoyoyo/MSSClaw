import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { FormField, FormInput, FormTextarea } from '@/components/center/CenterFormFields';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { skillDisplayName } from '@/domain/skillDisplay';
import { assertSkillScanAllowsApproval } from '@/domain/skillSecurityScan';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { shareSyncSaveHint } from '@/domain/shareSync';

export type SkillOpsRequestKind = 'update' | 'unpublish';

/**
 * 配置 Skill · 发起更新上架 / 下架审批（不可一键直接上下架）
 */
export function SkillOpsRequestModal({
  skill,
  kind,
  onClose,
}: {
  skill: PrototypeSkillSeed | null;
  kind: SkillOpsRequestKind | null;
  onClose: () => void;
}) {
  const showToast = useMarketplaceStore((s) => s.showToast);
  const openApproval = useAssetApprovalStore((s) => s.openApproval);
  const [targetVersion, setTargetVersion] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!skill || !kind) return;
    setTargetVersion(skill.version || '1.0.0');
    setNote('');
  }, [skill, kind]);

  if (!skill || !kind) return null;

  const isUpdate = kind === 'update';
  const title = isUpdate ? '发起更新上架申请' : '发起下架申请';

  const submit = () => {
    if (isUpdate) {
      const gate = assertSkillScanAllowsApproval(skill.securityScan);
      if (!gate.ok) {
        showToast(gate.message || '安全扫描未通过');
        return;
      }
      if (gate.message) showToast(gate.message);
      if (!targetVersion.trim()) {
        showToast('请填写目标版本号');
        return;
      }
      if (!note.trim()) {
        showToast('请填写更新 / 新增功能说明');
        return;
      }
      openApproval({
        kind: 'skill',
        assetId: skill.id,
        assetName: skillDisplayName(skill),
        reasons: ['update_version'],
        targetVersion: targetVersion.trim(),
        note: note.trim(),
      });
      showToast('已提交更新上架申请，待业务主管与 MSS 质量运营审批' + shareSyncSaveHint());
      onClose();
      return;
    }

    if (!note.trim()) {
      showToast('请填写下架理由（业务下线 / 安全整改 / 同质化合并等）');
      return;
    }
    openApproval({
      kind: 'skill',
      assetId: skill.id,
      assetName: skillDisplayName(skill),
      reasons: ['unpublish_skill'],
      unpublishMode: 'all',
      note: note.trim(),
    });
    showToast('已提交下架申请，审批通过后将从集市隐藏' + shareSyncSaveHint());
    onClose();
  };

  return (
    <CenterModal
      open
      elevate
      size="md"
      title={title}
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium text-zinc-600"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
          >
            提交审批
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-[12px] text-zinc-600">
          Skill：
          <span className="font-semibold text-zinc-900">{skillDisplayName(skill)}</span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="font-mono text-[11px] text-zinc-500">{skill.id}</span>
        </p>
        {isUpdate ? (
          <>
            <FormField label="目标版本号" hint="终审通过后写入当前版本">
              <FormInput
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="例如 1.1.0"
              />
            </FormField>
            <FormField label="更新 / 新增功能说明" hint="必填；随审批单流转">
              <FormTextarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="说明本次更新内容、影响范围与验证情况…"
              />
            </FormField>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              安全扫描报告附件：当前局域网版本扫描能力待对接 IT，申请单以文字说明为主；对接后将强制附带合规报告。
            </p>
          </>
        ) : (
          <>
            <FormField label="下架类型">
              <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[12px] text-zinc-700">
                <label className="flex items-center gap-2">
                  <input type="radio" checked readOnly className="accent-zinc-900" />
                  下架整个 Skill（全部版本从集市隐藏，仅运营后台可见）
                </label>
                <p className="mt-2 text-[11px] text-zinc-400">
                  「下架指定版本」为完整产品版能力，当前预留；多版本表上线后可勾选历史版本。
                </p>
              </div>
            </FormField>
            <FormField label="下架理由" hint="必填">
              <FormTextarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="业务下线 / 安全整改 / 同质化合并…"
              />
            </FormField>
          </>
        )}
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2 text-[11px] text-amber-900/80">
          平台禁止一键直接上下架。须经「提交人 → 业务主管 → MSS 质量与运营」全部通过后，系统自动变更线上状态。
        </p>
      </div>
    </CenterModal>
  );
}
