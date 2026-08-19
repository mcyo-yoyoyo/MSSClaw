import { useEffect, useRef, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import { OwnershipFormFields } from '@/components/center/OrgAssetFilters';
import {
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import type { AssetVisibility, DeptId, RegionId } from '@/domain/orgTaxonomy';
import { DEFAULT_SKILL_ACCENT } from '@/domain/skillAccent';
import { skillDisplayName, syncSkillZhPrimary } from '@/domain/skillDisplay';
import { parseSkillUpload } from '@/domain/skillExport';
import { suggestSkillSearchKeywords } from '@/domain/skillKeywords';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useMarketFilterStore } from '@/stores/marketFilterStore';
import { cn } from '@/lib/utils';
import {
  PACKAGE_UPLOAD_MAX_LABEL,
  packageUploadSizeError,
} from '@/domain/packageUpload';
import { packageZipErrorMessage } from '@/domain/safeZip';
import { uploadWorkspacePackage } from '@/api/blobApi';
import { currentWorkspaceId } from '@/api/platformDocsApi';

function slugCommand(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return base ? `skill-${base}` : `skill-${Date.now()}`;
}

/**
 * MSS 集市 · 提报场景技能
 * 对齐能力开发 Skill 上传（解析包 / 填基础信息），审批流与 SkillCenter 一致。
 */
export function MarketSkillSubmitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const user = useSessionStore((s) => s.user);
  const upsertSkill = useMarketplaceStore((s) => s.upsertSkill);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const businessFilter = useMarketFilterStore((s) => s.businessFilter);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [command, setCommand] = useState('');
  const [instructions, setInstructions] = useState('');
  const [businessId, setBusinessId] = useState<BusinessScenarioId | ''>('');
  const [ownerDeptIds, setOwnerDeptIds] = useState<DeptId[]>([]);
  const [ownerRegionId, setOwnerRegionId] = useState<RegionId | null>(null);
  const [visibility, setVisibility] = useState<AssetVisibility>('org');
  const [packName, setPackName] = useState<string | null>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parsedExtra, setParsedExtra] = useState<Partial<PrototypeSkillSeed> | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDesc('');
    setCommand('');
    setInstructions('');
    setBusinessId(businessFilter === 'all' ? '' : businessFilter);
    // 归属职能 / 区域不再按登录人预填：提报的技能未必属于本人所在职能，
    // 预填会被当成已确认的选择而直接提交
    setOwnerDeptIds([]);
    setOwnerRegionId(null);
    setVisibility('org');
    setPackName(null);
    setPackageFile(null);
    setParsedExtra(null);
    setParsing(false);
    setSubmitting(false);
  }, [open, user, businessFilter]);

  if (!open) return null;

  const applyParsed = (parsed: PrototypeSkillSeed, fileLabel: string) => {
    setName(parsed.nameZh || parsed.name || '');
    setDesc(parsed.descZh || parsed.desc || '');
    setCommand(parsed.command || '');
    setInstructions(parsed.instructions || '');
    if (parsed.businessScenarioId) setBusinessId(parsed.businessScenarioId);
    setParsedExtra({
      nameEn: parsed.nameEn,
      descEn: parsed.descEn,
      tags: parsed.tags,
      searchKeywords: parsed.searchKeywords,
      planSteps: parsed.planSteps,
      version: parsed.version,
      icon: parsed.icon,
      accentColor: parsed.accentColor,
    });
    setPackName(fileLabel);
    showToast(`已解析 Skill 包「${fileLabel}」，请确认信息后提交审批`);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setPackageFile(null);
    const sizeError = packageUploadSizeError(file);
    if (sizeError) {
      showToast(sizeError);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setParsing(true);
    try {
      const items = await parseSkillUpload(file);
      if (!items[0]) {
        showToast('未能识别标准 Skill 包（支持 .skill.zip / SKILL.md / JSON）');
        return;
      }
      applyParsed(items[0], file.name);
      setPackageFile(file.name.toLowerCase().endsWith('.zip') ? file : null);
    } catch (error) {
      showToast(packageZipErrorMessage(error, 'Skill 包解析失败，请检查格式'));
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (parsing) {
      showToast('Skill 包仍在解析，请稍候');
      return;
    }
    const nameZh = name.trim();
    if (!nameZh) {
      showToast('请填写技能名称，或先上传 Skill 包');
      return;
    }
    if (!businessId) {
      showToast('请选择业务场景');
      return;
    }

    const userName = getCurrentUserName() || user?.name || '业务用户';
    const userId = getCurrentUserId() || user?.id;
    const id = `skill-submit-${Date.now()}`;
    const cmd = (command.trim() || slugCommand(nameZh)).replace(/^\//, '');
    const descZh = desc.trim() || '业务提报场景技能（待运营完善）';
    let packageBlob: PrototypeSkillSeed['packageBlob'];

    if (packageFile) {
      setSubmitting(true);
      try {
        const uploaded = await uploadWorkspacePackage(currentWorkspaceId(), packageFile);
        packageBlob = {
          id: uploaded.id,
          url: uploaded.url,
          name: uploaded.name,
          size: uploaded.size,
          uploadedAt: new Date().toISOString(),
        };
      } catch {
        showToast('Skill 原包留档失败，请检查登录状态或后端连接后重试');
        setSubmitting(false);
        return;
      }
    }

    let draft = syncSkillZhPrimary({
      id,
      name: nameZh,
      nameZh,
      nameEn: parsedExtra?.nameEn?.trim() || '',
      desc: descZh,
      descZh,
      descEn: parsedExtra?.descEn?.trim() || '',
      category: 'office',
      command: cmd,
      version: parsedExtra?.version?.trim() || '1.0.0',
      connector: '',
      author: userName,
      publisher: userName,
      publisherUserId: userId || undefined,
      published: false,
      invokes: 0,
      icon: parsedExtra?.icon || 'fa-cube',
      accentColor: parsedExtra?.accentColor || DEFAULT_SKILL_ACCENT,
      tags: [...(parsedExtra?.tags ?? []), '提报'].filter(Boolean),
      searchKeywords: parsedExtra?.searchKeywords?.length
        ? parsedExtra.searchKeywords
        : suggestSkillSearchKeywords({
            nameZh,
            descZh,
            instructions,
            command: cmd,
          }),
      instructions: instructions.trim() || undefined,
      planSteps: parsedExtra?.planSteps ?? [],
      packageBlob,
      sourceType: 'internal',
      visibility,
      ownerDeptIds: ownerDeptIds.slice(0, 1),
      ownerRegionId,
      homepageUrl: undefined,
      businessScenarioId: businessId,
      // 提报至 MSS 场景技能：审批通过后露出
      featuredInDoTask: true,
      featuredInMssMarket: true,
    } as PrototypeSkillSeed);

    draft = syncSkillZhPrimary(draft);
    upsertSkill(draft, true);
    onClose();
    useAssetApprovalStore.getState().openApproval({
      kind: 'skill',
      assetId: id,
      assetName: skillDisplayName(draft),
      reasons: ['publish_executable'],
    });
    showToast('技能已提报，进入上架审批');
  };

  const handleClose = () => {
    if (submitting) {
      showToast('Skill 原包正在上传，请稍候');
      return;
    }
    onClose();
  };

  return (
    <CenterModal
      open
      title="提报场景技能"
      onClose={handleClose}
      size="lg"
      actions={
        <ModalActions
          onCancel={handleClose}
          onSave={() => void handleSubmit()}
          saveLabel={submitting ? '正在上传…' : '提交审批'}
        />
      }
    >
      <div className="space-y-3 text-left">
        <p className="text-[11px] leading-relaxed text-zinc-500">
          对齐能力开发「Skill 上传」：可上传标准 Skill 包自动解析，或手工填写。提交后进入「业务主管 →
          MSS 质量与运营」审批；通过后上架可调用，并露出到 MSS · 场景技能。
        </p>

        <div
          className={cn(
            'rounded-xl border border-dashed px-3 py-3',
            packName ? 'border-emerald-300 bg-emerald-50/50' : 'border-zinc-200 bg-zinc-50/80',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-zinc-800">上传 Skill 包（推荐）</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                支持 .skill.zip / SKILL.md / JSON（≤{PACKAGE_UPLOAD_MAX_LABEL}），与能力开发「配置Skill」一致
              </p>
              {packName ? (
                <p className="mt-1 truncate text-[11px] font-medium text-emerald-700">
                  已解析：{packName}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".zip,.skill,.md,.json,application/zip,text/markdown,application/json"
                className="hidden"
                onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={parsing || submitting}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {parsing ? '解析中…' : packName ? '重新上传' : '选择文件'}
              </button>
            </div>
          </div>
        </div>

        <FormField label="技能名称">
          <FormInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="中文展示名"
          />
        </FormField>
        <FormField label="场景说明">
          <FormTextarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="适用场景与价值"
          />
        </FormField>
        <FormField label="调用命令（可选）">
          <FormInput
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="留空将按名称自动生成"
          />
        </FormField>
        <FormField label="Skill 正文 / 指令（可选）">
          <FormTextarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="上传包通常已带正文；也可在此补充"
          />
        </FormField>
        <FormField label="业务场景">
          <FormSelect
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value as BusinessScenarioId | '')}
          >
            <option value="">—请选择业务场景—</option>
            {listVisibleBusinessScenarioCategories().map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <OwnershipFormFields
          singleDept
          ownerDeptIds={ownerDeptIds}
          ownerRegionId={ownerRegionId}
          sourceType="internal"
          visibility={visibility}
          onChange={(patch) => {
            if (patch.ownerDeptIds) setOwnerDeptIds(patch.ownerDeptIds as DeptId[]);
            if (patch.ownerRegionId !== undefined) {
              setOwnerRegionId(patch.ownerRegionId as RegionId | null);
            }
            if (patch.visibility) setVisibility(patch.visibility);
          }}
        />
      </div>
    </CenterModal>
  );
}
