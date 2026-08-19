import { useEffect, useMemo, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import {
  getBusinessScenarioMeta,
  listVisibleBusinessScenarioCategories,
  type BusinessScenarioId,
} from '@/domain/businessScenarios';
import {
  AGENT_CAPABILITY_TYPES,
  AGENT_PLATFORM_PRESETS,
  type AgentCapabilityTypeId,
} from '@/domain/agentHubFilters';
import {
  AGENT_LIFECYCLE_OPTIONS,
  resolveAgentLifecycle,
  type AgentLifecycleStatus,
} from '@/domain/agentLifecycle';
import type { AgentCaseItem, PrototypeAgentSeed } from '@/domain/prototype/types';
import { uploadWorkspacePackage } from '@/api/blobApi';
import { currentWorkspaceId } from '@/api/platformDocsApi';
import {
  ASSET_VISIBILITY_LABELS,
  HQ_DEPTS,
  REGIONS,
  type AssetVisibility,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import {
  chatIdForBusinessScenario,
  resolveAgentBusinessScenario,
  resolveAgentFeaturedInDoTask,
} from '@/domain/agentBusinessScenarios';
import { DO_TASK_FEATURED_HINT } from '@/domain/capabilityShelf';
import { skillDisplayName } from '@/domain/skillDisplay';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useAssetApprovalStore } from '@/stores/assetApprovalStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useBusinessScenarioCatalogStore } from '@/stores/businessScenarioCatalogStore';
import {
  formatPackageSize,
  PACKAGE_UPLOAD_MAX_LABEL,
  packageUploadSizeError,
} from '@/domain/packageUpload';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { shareSyncSaveHint } from '@/domain/shareSync';
import {
  AGENT_AVATAR_PRESETS,
  DEFAULT_AGENT_AVATAR_PRESET_ID,
} from '@/domain/agentAvatars';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { cn } from '@/lib/utils';
import { useTemporaryWorkspaceBlobs } from '@/hooks/useTemporaryWorkspaceBlobs';

export type AgentEditorTarget = string | 'new' | null;

const AVATAR_MAX_BYTES = 512 * 1024;

function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > AVATAR_MAX_BYTES) {
      reject(new Error('头像请小于 512KB'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择图片文件'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

function emptyAgent(): PrototypeAgentSeed {
  const name = getCurrentUserName() || 'Mcyo';
  return {
    id: '',
    name: '',
    desc: '',
    category: 'office',
    bizLine: 'MSS 全员',
    homeTag: 'mkt',
    author: name,
    publisher: name,
    publisherUserId: getCurrentUserId() || undefined,
    published: false,
    invokes: 0,
    skillIds: [],
    primarySkillId: undefined,
    demoPrompt: '',
    planSteps: [],
    chatId: 'marketing',
    icon: 'fa-robot',
    color: 'from-[#18181b] to-[#18181b]',
    avatarPresetId: DEFAULT_AGENT_AVATAR_PRESET_ID,
    avatarUrl: undefined,
    systemPrompt: '',
    visibility: 'public',
    businessScenarioId: undefined,
  };
}

function normalizeAgent(agent: PrototypeAgentSeed): PrototypeAgentSeed {
  return {
    ...emptyAgent(),
    ...agent,
    skillIds: Array.isArray(agent.skillIds) ? agent.skillIds : [],
    planSteps: Array.isArray(agent.planSteps) ? agent.planSteps : [],
    systemPrompt: agent.systemPrompt ?? '',
    demoPrompt: agent.demoPrompt ?? '',
    avatarPresetId: agent.avatarUrl
      ? undefined
      : agent.avatarPresetId || DEFAULT_AGENT_AVATAR_PRESET_ID,
    avatarUrl: agent.avatarUrl,
    featuredInDoTask: resolveAgentFeaturedInDoTask(agent),
    visibility:
      agent.visibility === 'org' || agent.visibility === 'private'
        ? agent.visibility
        : 'public',
    businessScenarioId: resolveAgentBusinessScenario(agent) ?? undefined,
  };
}

interface AgentEditorModalProps {
  target: AgentEditorTarget;
  onClose: () => void;
}

/** 多行文本 → 草稿数组：保存时再统一去空白，避免输入回车后空行被立即吞掉。 */
function splitLines(value: string): string[] {
  return value.split('\n');
}

type AgentFaqItem = NonNullable<
  NonNullable<PrototypeAgentSeed['quickStart']>['faqs']
>[number];

/** 空字符串和空数组清理后，仅在至少有一个有效字段时保留嵌套对象。 */
function compactObject<T extends object>(value: T): T | undefined {
  return Object.values(value).some((item) => item !== undefined) ? value : undefined;
}

export function AgentEditorModal({ target, onClose }: AgentEditorModalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const upsertAgent = useMarketplaceStore((s) => s.upsertAgent);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const temporaryPackageBlobs = useTemporaryWorkspaceBlobs(target);

  /**
   * 执行包原样存进 blob，详情页据此展示目录树并下发真实原包。
   * 使用专用二进制接口上传，体积上限与 Skill 文件包一致。
   */
  const uploadPackage = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showToast('请上传 .zip 格式的执行包');
      return;
    }
    const sizeError = packageUploadSizeError(file);
    if (sizeError) {
      showToast(sizeError);
      return;
    }
    const replacedPackageBlob = form.packageBlob;
    setUploadingPackage(true);
    const workspaceId = currentWorkspaceId();
    const uploadGeneration = temporaryPackageBlobs.currentGeneration();
    try {
      const uploaded = await uploadWorkspacePackage(workspaceId, file);
      if (!temporaryPackageBlobs.trackUploaded(workspaceId, uploaded, uploadGeneration)) {
        return;
      }
      temporaryPackageBlobs.discard(replacedPackageBlob);
      setForm((f) => ({
        ...f,
        packageBlob: {
          id: uploaded.id,
          url: uploaded.url,
          name: uploaded.name,
          size: uploaded.size,
          uploadedAt: new Date().toISOString(),
        },
      }));
      showToast(`已上传执行包：${uploaded.name}`);
    } catch {
      if (temporaryPackageBlobs.isCurrent(uploadGeneration)) {
        showToast('执行包上传失败，请检查后端连接后重试');
      }
    } finally {
      if (temporaryPackageBlobs.isCurrent(uploadGeneration)) {
        setUploadingPackage(false);
      }
    }
  };
  const setAppView = useAppViewStore((s) => s.setAppView);
  const hydrateBusinessCatalog = useBusinessScenarioCatalogStore((s) => s.hydrate);
  const [form, setForm] = useState<PrototypeAgentSeed>(emptyAgent());
  const [skillQuery, setSkillQuery] = useState('');
  const [onlyPublishedSkills, setOnlyPublishedSkills] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [uploadingPackage, setUploadingPackage] = useState(false);
  const businessOptions = useMemo(() => listVisibleBusinessScenarioCategories(), []);

  useEffect(() => {
    hydrateBusinessCatalog();
  }, [hydrateBusinessCatalog]);

  useEffect(() => {
    setUploadingPackage(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    setSkillQuery('');
    setOnlyPublishedSkills(false);
    setAvatarPickerOpen(false);
    if (target === 'new') {
      setForm(emptyAgent());
      return;
    }
    const existing = agents.find((a) => a.id === target);
    setForm(existing ? normalizeAgent(existing) : emptyAgent());
  }, [target, agents]);

  /** 与「配置Skill」共用 marketplaceStore.skills，实时同步 */
  const mountableSkills = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    let list = skills.slice();
    if (onlyPublishedSkills) list = list.filter((s) => s.published);
    if (q) {
      list = list.filter((s) => {
        const blob = [
          skillDisplayName(s),
          s.name,
          s.nameEn,
          s.command,
          s.descZh,
          s.desc,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    const selected = new Set(form.skillIds);
    list.sort((a, b) => {
      const aSel = selected.has(a.id) ? 0 : 1;
      const bSel = selected.has(b.id) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      if (Boolean(a.published) !== Boolean(b.published)) return a.published ? -1 : 1;
      return skillDisplayName(a).localeCompare(skillDisplayName(b), 'zh-CN');
    });
    return list;
  }, [skills, skillQuery, onlyPublishedSkills, form.skillIds]);

  const missingMountedIds = useMemo(
    () => form.skillIds.filter((id) => !skills.some((s) => s.id === id)),
    [form.skillIds, skills],
  );

  if (!target) return null;

  const isNew = target === 'new';
  const title = isNew
    ? '创建 Agent'
    : agents.find((agent) => agent.id === target)?.name.trim() || 'Agent';

  const toggleSkill = (skillId: string) => {
    setForm((f) => {
      const nextIds = f.skillIds.includes(skillId)
        ? f.skillIds.filter((id) => id !== skillId)
        : [...f.skillIds, skillId];
      const primarySkillId =
        f.primarySkillId && nextIds.includes(f.primarySkillId)
          ? f.primarySkillId
          : nextIds[0];
      return { ...f, skillIds: nextIds, primarySkillId };
    });
  };

  const handleClose = () => {
    temporaryPackageBlobs.finish();
    onClose();
  };

  const removePackageBlob = () => {
    temporaryPackageBlobs.discard(form.packageBlob);
    setForm((current) => ({ ...current, packageBlob: undefined }));
  };

  const toggleCapabilityType = (capabilityTypeId: AgentCapabilityTypeId) => {
    setForm((current) => {
      const selected = current.capabilityTypeIds ?? [];
      return {
        ...current,
        capabilityTypeIds: selected.includes(capabilityTypeId)
          ? selected.filter((id) => id !== capabilityTypeId)
          : [...selected, capabilityTypeId],
      };
    });
  };

  const toggleOwnerDept = (deptId: DeptId) => {
    setForm((current) => {
      const selected = current.ownerDeptIds ?? [];
      return {
        ...current,
        ownerDeptIds: selected.includes(deptId)
          ? selected.filter((id) => id !== deptId)
          : [...selected, deptId],
      };
    });
  };

  const toggleOwnerRegion = (regionId: RegionId) => {
    setForm((current) => {
      const selected = current.ownerRegionIds ?? [];
      return {
        ...current,
        ownerRegionIds: selected.includes(regionId)
          ? selected.filter((id) => id !== regionId)
          : [...selected, regionId],
      };
    });
  };

  const updateCase = (index: number, patch: Partial<AgentCaseItem>) => {
    setForm((current) => ({
      ...current,
      cases: (current.cases ?? []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const updateFaq = (index: number, patch: Partial<AgentFaqItem>) => {
    setForm((current) => ({
      ...current,
      quickStart: {
        ...current.quickStart,
        faqs: (current.quickStart?.faqs ?? []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
        ),
      },
    }));
  };

  const handleSave = () => {
    if (uploadingPackage) {
      showToast('执行包正在上传，请稍候');
      return;
    }
    if (!temporaryPackageBlobs.canCommit(form.packageBlob)) {
      setForm((current) => ({ ...current, packageBlob: undefined }));
      showToast('工作区或 API 配置已变更，请重新上传执行包');
      return;
    }
    const name = form.name.trim();
    if (!name) {
      showToast('请填写 Agent 名称');
      return;
    }
    if (!form.systemPrompt?.trim()) {
      showToast('请填写 Persona（人设）');
      return;
    }
    if (!form.businessScenarioId) {
      showToast('请选择业务场景分类');
      return;
    }
    const incompleteFaqIndex = (form.quickStart?.faqs ?? []).findIndex((item) => {
      const hasQuestion = Boolean(item.question.trim());
      const hasAnswer = Boolean(item.answer.trim());
      return hasQuestion !== hasAnswer;
    });
    if (incompleteFaqIndex >= 0) {
      showToast(`请完整填写常见问题 ${incompleteFaqIndex + 1} 的问题和答案`);
      return;
    }
    const incompleteCaseIndex = (form.cases ?? []).findIndex((item) => {
      const hasDetail = [
        item.scenario,
        item.audience,
        item.problem,
        item.input,
        item.output,
        item.outcome,
        item.resourceUrl,
      ].some((value) => Boolean(value?.trim()));
      return hasDetail && !item.title.trim();
    });
    if (incompleteCaseIndex >= 0) {
      showToast(`请填写案例 ${incompleteCaseIndex + 1} 的标题`);
      return;
    }
    const prev = !isNew ? agents.find((a) => a.id === target) : null;
    const id = isNew ? `agent-${Date.now()}` : (target as string);
    const needsApproval = isNew || (form.published && !prev?.published);
    const planSteps = (form.planSteps ?? []).map((s) => s.trim()).filter(Boolean);
    const visibility: AssetVisibility =
      form.visibility === 'org' || form.visibility === 'private' ? form.visibility : 'public';
    const businessScenarioId = form.businessScenarioId as BusinessScenarioId;
    const scenarioLabel = getBusinessScenarioMeta(businessScenarioId).label;
    // 空字符串 / 空数组不落库，避免前台把"已配置但为空"当成有内容而不再走兜底
    const clean = (v?: string) => v?.trim() || undefined;
    const cleanList = (values?: string[]) => {
      const result = Array.from(
        new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
      );
      return result.length ? result : undefined;
    };
    const inputOutput = compactObject({
      processSteps: cleanList(form.inputOutput?.processSteps),
      inputTypes: cleanList(form.inputOutput?.inputTypes),
      inputFormat: clean(form.inputOutput?.inputFormat),
      inputFields: cleanList(form.inputOutput?.inputFields),
      inputExample: clean(form.inputOutput?.inputExample),
      supportedFiles: cleanList(form.inputOutput?.supportedFiles),
      outputFormat: clean(form.inputOutput?.outputFormat),
      outputFields: cleanList(form.inputOutput?.outputFields),
      outputExample: clean(form.inputOutput?.outputExample),
      resultUsage: clean(form.inputOutput?.resultUsage),
    });
    const faqs = (form.quickStart?.faqs ?? [])
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);
    const quickStart = compactObject({
      prerequisites: cleanList(form.quickStart?.prerequisites),
      inputRequirements: cleanList(form.quickStart?.inputRequirements),
      steps: cleanList(form.quickStart?.steps),
      installGuide: clean(form.quickStart?.installGuide),
      faqs: faqs.length ? faqs : undefined,
    });
    const cases = (form.cases ?? [])
      .map((item) => ({
        title: item.title.trim(),
        scenario: clean(item.scenario),
        audience: clean(item.audience),
        problem: clean(item.problem),
        input: clean(item.input),
        output: clean(item.output),
        outcome: clean(item.outcome),
        resourceUrl: clean(item.resourceUrl),
      }))
      .filter((item) => item.title);
    const environment = compactObject({
      platforms: cleanList(form.environment?.platforms),
      usageModes: cleanList(form.environment?.usageModes),
      requirements: cleanList(form.environment?.requirements),
      configuration: cleanList(form.environment?.configuration),
      packageGuide: clean(form.environment?.packageGuide),
      requiresCode: form.environment?.requiresCode,
      supportsAssistantImport: form.environment?.supportsAssistantImport,
    });
    const now = new Date().toISOString().slice(0, 10);

    upsertAgent(
      {
        ...form,
        id,
        name,
        valueProposition: clean(form.valueProposition),
        capabilities: cleanList(form.capabilities),
        targetUsers: cleanList(form.targetUsers),
        capabilityBoundaries: cleanList(form.capabilityBoundaries),
        suitableFor: cleanList(form.suitableFor),
        notSuitableFor: cleanList(form.notSuitableFor),
        inputOutput,
        quickStart,
        cases: cases.length ? cases : undefined,
        version: clean(form.version),
        versionSummary: clean(form.versionSummary),
        maintainer: clean(form.maintainer),
        demoUrl: clean(form.demoUrl),
        solutionDocUrl: clean(form.solutionDocUrl),
        installCommand: clean(form.installCommand),
        feedbackUrl: clean(form.feedbackUrl),
        environment,
        scenarioTags: cleanList(form.scenarioTags),
        ownerDeptIds: cleanList(form.ownerDeptIds) as DeptId[] | undefined,
        ownerRegionIds: cleanList(form.ownerRegionIds) as RegionId[] | undefined,
        capabilityTypeIds: form.capabilityTypeIds?.length
          ? Array.from(new Set(form.capabilityTypeIds))
          : undefined,
        packageBlob: form.packageBlob,
        // 运营改过内容就刷新更新时间，右侧操作栏与 Agent Hub「更新时间」排序都读它
        createdAt: isNew ? now : (prev?.createdAt || form.createdAt),
        updatedAt: now,
        desc: form.desc.trim(),
        systemPrompt: form.systemPrompt?.trim() || '',
        demoPrompt: form.demoPrompt?.trim() || undefined,
        primarySkillId: form.primarySkillId || form.skillIds[0],
        planSteps: planSteps.length ? planSteps : undefined,
        category: prev?.category ?? 'office',
        bizLine: scenarioLabel,
        homeTag: prev?.homeTag ?? 'mkt',
        chatId: chatIdForBusinessScenario(businessScenarioId),
        businessScenarioId,
        author: prev?.author ?? (getCurrentUserName() || 'Mcyo'),
        publisher: form.publisher || getCurrentUserName() || 'Mcyo',
        publisherUserId: form.publisherUserId || getCurrentUserId() || undefined,
        invokes: prev?.invokes ?? 0,
        icon: form.icon || prev?.icon || 'fa-robot',
        color: form.color || prev?.color || 'from-[#18181b] to-[#18181b]',
        avatarPresetId: form.avatarUrl
          ? undefined
          : form.avatarPresetId || DEFAULT_AGENT_AVATAR_PRESET_ID,
        avatarUrl: form.avatarUrl?.trim() || undefined,
        published: needsApproval ? false : form.published,
        visibility,
      },
      isNew,
    );
    temporaryPackageBlobs.finish(form.packageBlob);
    onClose();
    if (needsApproval) {
      useAssetApprovalStore.getState().openApproval({
        kind: 'agent',
        assetId: id,
        assetName: name,
      });
      showToast('Agent 已保存，已进入上架审批' + shareSyncSaveHint());
    } else {
      showToast((form.published ? 'Agent 已保存' : 'Agent 已保存（草稿）') + shareSyncSaveHint());
    }
  };

  return (
    <CenterModal
      open
      elevate
      size="lg"
      title={title}
      onClose={handleClose}
      actions={<ModalActions onCancel={handleClose} onSave={handleSave} />}
    >
      <div className="space-y-3 text-left">
        <div>
          <p className="text-[11px] font-semibold text-[#86868b]">数字员工形象</p>
          <p className="mb-1 text-[10px] text-[#86868b]">
            点击当前头像后选择系统形象，或上传自定义头像（PNG/JPG/WebP，≤512KB）
          </p>
          <div className="space-y-2">
            <button
              type="button"
              aria-label="更换数字员工形象"
              aria-expanded={avatarPickerOpen}
              aria-controls="agent-avatar-picker"
              onClick={() => setAvatarPickerOpen((open) => !open)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
            >
              <AgentPortrait
                agentId={form.id || 'new'}
                name={form.name || 'Agent'}
                icon={form.icon}
                avatarUrl={form.avatarUrl}
                avatarPresetId={form.avatarPresetId}
                size={52}
                className="rounded-2xl ring-1 ring-zinc-200"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-zinc-800">
                  {form.avatarUrl
                    ? '自定义头像'
                    : AGENT_AVATAR_PRESETS.find((preset) => preset.id === form.avatarPresetId)
                        ?.label || '系统头像'}
                </span>
                <span className="mt-0.5 block text-[10px] text-zinc-500">
                  点击头像{avatarPickerOpen ? '收起选择' : '更换形象'}
                </span>
              </span>
              <i
                className={cn(
                  'fa-solid fa-chevron-down text-[10px] text-zinc-400 transition-transform',
                  avatarPickerOpen && 'rotate-180',
                )}
              />
            </button>
            {avatarPickerOpen ? (
              <div
                id="agent-avatar-picker"
                className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3"
              >
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                  {AGENT_AVATAR_PRESETS.map((p) => {
                    const active = !form.avatarUrl && form.avatarPresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        title={`${p.label} · ${p.hint}`}
                        aria-label={`选择${p.label}头像`}
                        aria-pressed={active}
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            avatarPresetId: p.id,
                            avatarUrl: undefined,
                          }));
                          setAvatarPickerOpen(false);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-xl border bg-white p-1.5 transition',
                          active
                            ? 'border-zinc-900 ring-1 ring-zinc-900'
                            : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
                        )}
                      >
                        <img
                          src={p.src}
                          alt={p.label}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <span className="w-full truncate text-[9px] font-medium text-zinc-600">
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-zinc-200 pt-3">
                  <p className="mb-1.5 text-[10px] font-semibold text-zinc-500">上传自定义头像</p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="block w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      void readAvatarFile(file)
                        .then((dataUrl) => {
                          setForm((current) => ({
                            ...current,
                            avatarUrl: dataUrl,
                            avatarPresetId: undefined,
                          }));
                          setAvatarPickerOpen(false);
                          showToast('自定义头像已上传');
                        })
                        .catch((err: Error) => showToast(err.message || '上传失败'));
                    }}
                  />
                  {form.avatarUrl ? (
                    <button
                      type="button"
                      className="mt-2 text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          avatarUrl: undefined,
                          avatarPresetId:
                            current.avatarPresetId || DEFAULT_AGENT_AVATAR_PRESET_ID,
                        }));
                        setAvatarPickerOpen(false);
                      }}
                    >
                      清除上传，改用系统预设
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <FormField label="名称">
          <FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="描述">
          <FormTextarea
            rows={2}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
        <FormField label="Persona（人设）" hint="对话执行时注入的角色与约束">
          <FormTextarea
            rows={4}
            className="font-mono text-[12px]"
            placeholder="角色定位、默认 Skill、输出结构与边界…"
            value={form.systemPrompt ?? ''}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          />
        </FormField>
        <FormField
          label="演示任务（调用时自动发送）"
          hint="建议包含 @专家名 与主 Skill 的 /指令"
        >
          <FormTextarea
            rows={3}
            className="font-mono text-[12px]"
            placeholder={`@${form.name || 'Agent名'} /技能指令 请基于演示样例…`}
            value={form.demoPrompt ?? ''}
            onChange={(e) => setForm({ ...form, demoPrompt: e.target.value })}
          />
        </FormField>
        <FormField label="编排计划（每行一步）" hint="多 Skill 编排步骤；留空则用主 Skill 计划">
          <FormTextarea
            rows={4}
            className="font-mono text-[12px]"
            placeholder={'挂载主 Skill\n执行辅助 Skill\n汇总行动建议'}
            value={(form.planSteps ?? []).join('\n')}
            onChange={(e) =>
              setForm({
                ...form,
                planSteps: e.target.value.split('\n'),
              })
            }
          />
        </FormField>
        <FormField
          label="业务场景分类"
          hint="与业务用户 MSS 集市视角对齐；决定场景专家归类"
        >
          <FormSelect
            value={form.businessScenarioId ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                businessScenarioId: (e.target.value || undefined) as
                  | BusinessScenarioId
                  | undefined,
              })
            }
          >
            <option value="">— 请选择业务场景 —</option>
            {businessOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <details className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-semibold text-zinc-700">
            Agent Hub 顶部与筛选
          </summary>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold text-[#86868b]">所属职能（可多选）</p>
                <p className="mb-1 text-[10px] text-[#86868b]">
                  详情顶部展示首项；Agent Hub 筛选匹配全部归属
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {HQ_DEPTS.map((dept) => (
                    <label
                      key={dept.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        className="accent-claw-600"
                        checked={(form.ownerDeptIds ?? []).includes(dept.id)}
                        onChange={() => toggleOwnerDept(dept.id)}
                      />
                      {dept.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#86868b]">所属区域（可多选）</p>
                <p className="mb-1 text-[10px] text-[#86868b]">
                  详情顶部展示首项；Agent Hub 筛选匹配全部归属
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {REGIONS.map((region) => (
                    <label
                      key={region.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        className="accent-claw-600"
                        checked={(form.ownerRegionIds ?? []).includes(region.id)}
                        onChange={() => toggleOwnerRegion(region.id)}
                      />
                      {region.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#86868b]">能力类型</p>
              <p className="mb-1 text-[10px] text-[#86868b]">
                显示在详情顶部并参与筛选；可多选，未选择时按名称、描述和标签自动推断
              </p>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {AGENT_CAPABILITY_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[12px] text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      className="accent-claw-600"
                      checked={(form.capabilityTypeIds ?? []).includes(type.id)}
                      onChange={() => toggleCapabilityType(type.id)}
                    />
                    <i className={cn('fa-solid w-3.5 text-[10px] text-zinc-400', type.icon)} />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>
            <FormField
              label="适用场景标签（每行一条）"
              hint="与业务场景分类一起展示在详情「概览 · 适用场景」"
            >
              <FormTextarea
                rows={3}
                placeholder={'新品上市\n渠道洞察\n经营分析'}
                value={(form.scenarioTags ?? []).join('\n')}
                onChange={(e) => setForm({ ...form, scenarioTags: splitLines(e.target.value) })}
              />
            </FormField>
          </div>
        </details>
        {/* §6：详情页内容配置。字段多，按前台 Tab 分组折叠，默认收起不干扰日常编辑 */}
        <details className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-semibold text-zinc-700">
            详情页 · 概览 / 效果预览 / 适用判断 / 怎么使用 / 版本
          </summary>
          <div className="mt-3 space-y-3">
            <FormField
              label="一句话价值"
              hint="用业务语言说明能帮用户完成什么工作；顶部与概览共用，避免技术化描述"
            >
              <FormInput
                value={form.valueProposition ?? ''}
                placeholder="例：帮助审核员解析一单一包材料，识别缺失、异常与不一致项"
                onChange={(e) => setForm({ ...form, valueProposition: e.target.value })}
              />
            </FormField>
            <FormField label="核心能力（每行一条）" hint="3-5 项，如材料解析、规则匹配、内容生成">
              <FormTextarea
                rows={3}
                value={(form.capabilities ?? []).join('\n')}
                onChange={(e) => setForm({ ...form, capabilities: splitLines(e.target.value) })}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="适用对象（每行一条）" hint="如营销人员、审核专员、运营人员">
                <FormTextarea
                  rows={3}
                  value={(form.targetUsers ?? []).join('\n')}
                  onChange={(e) => setForm({ ...form, targetUsers: splitLines(e.target.value) })}
                />
              </FormField>
              <FormField label="能力边界（每行一条）" hint="不能覆盖或不能替代人工的范围">
                <FormTextarea
                  rows={3}
                  value={(form.capabilityBoundaries ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({ ...form, capabilityBoundaries: splitLines(e.target.value) })
                  }
                />
              </FormField>
            </div>

            <p className="border-t border-zinc-200 pt-2.5 text-[11px] font-semibold text-zinc-500">
              效果预览 · 输入 → 处理 → 输出
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="输入类型（每行一条）" hint="详情「你提供」中的输入清单">
                <FormTextarea
                  rows={3}
                  placeholder={'任务目标\n业务数据\n参考材料'}
                  value={(form.inputOutput?.inputTypes ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, inputTypes: splitLines(e.target.value) },
                    })
                  }
                />
              </FormField>
              <FormField label="支持文件（每行一条）" hint="如 Excel、PDF、PPTX">
                <FormTextarea
                  rows={3}
                  placeholder={'Excel\nPDF\nPPTX'}
                  value={(form.inputOutput?.supportedFiles ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: {
                        ...form.inputOutput,
                        supportedFiles: splitLines(e.target.value),
                      },
                    })
                  }
                />
              </FormField>
              <FormField label="输入说明" hint="用户需要提供什么">
                <FormTextarea
                  rows={2}
                  value={form.inputOutput?.inputFormat ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, inputFormat: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="输出说明" hint="最终产出什么结果">
                <FormTextarea
                  rows={2}
                  value={form.inputOutput?.outputFormat ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, outputFormat: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="输入关键字段（每行一条）">
                <FormTextarea
                  rows={3}
                  value={(form.inputOutput?.inputFields ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, inputFields: splitLines(e.target.value) },
                    })
                  }
                />
              </FormField>
              <FormField label="输出关键字段（每行一条）">
                <FormTextarea
                  rows={3}
                  value={(form.inputOutput?.outputFields ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, outputFields: splitLines(e.target.value) },
                    })
                  }
                />
              </FormField>
            </div>
            <FormField label="处理过程（每行一步）" hint="用业务语言说明会做哪些处理，如识别、抽取、匹配、汇总">
              <FormTextarea
                rows={3}
                value={(form.inputOutput?.processSteps ?? []).join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    inputOutput: { ...form.inputOutput, processSteps: splitLines(e.target.value) },
                  })
                }
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="样例输入" hint="留空时回退上方演示任务">
                <FormTextarea
                  rows={3}
                  value={form.inputOutput?.inputExample ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, inputExample: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="样例输出" hint="贴近真实业务结果，不要用无意义占位">
                <FormTextarea
                  rows={3}
                  value={form.inputOutput?.outputExample ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inputOutput: { ...form.inputOutput, outputExample: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>
            <FormField label="输出用途" hint="结果可以如何用于业务">
              <FormInput
                value={form.inputOutput?.resultUsage ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    inputOutput: { ...form.inputOutput, resultUsage: e.target.value },
                  })
                }
              />
            </FormField>

            <p className="border-t border-zinc-200 pt-2.5 text-[11px] font-semibold text-zinc-500">
              适用判断
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="适合你，如果（每行一条）">
                <FormTextarea
                  rows={3}
                  value={(form.suitableFor ?? []).join('\n')}
                  onChange={(e) => setForm({ ...form, suitableFor: splitLines(e.target.value) })}
                />
              </FormField>
              <FormField label="暂不适合，如果（每行一条）">
                <FormTextarea
                  rows={3}
                  value={(form.notSuitableFor ?? []).join('\n')}
                  onChange={(e) => setForm({ ...form, notSuitableFor: splitLines(e.target.value) })}
                />
              </FormField>
            </div>
            <FormField label="使用前需要准备（每行一条）" hint="材料、数据、权限或业务背景">
              <FormTextarea
                rows={2}
                value={(form.quickStart?.prerequisites ?? []).join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quickStart: { ...form.quickStart, prerequisites: splitLines(e.target.value) },
                  })
                }
              />
            </FormField>
            <FormField label="输入要求（每行一条）" hint="同时展示在「适用判断」与「怎么使用」">
              <FormTextarea
                rows={2}
                value={(form.quickStart?.inputRequirements ?? []).join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quickStart: {
                      ...form.quickStart,
                      inputRequirements: splitLines(e.target.value),
                    },
                  })
                }
              />
            </FormField>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-zinc-700">
              <input
                type="checkbox"
                className="accent-zinc-800"
                checked={Boolean(form.requiresHumanReview)}
                onChange={(e) => setForm({ ...form, requiresHumanReview: e.target.checked })}
              />
              输出需要人工复核后才能用于对外决策
            </label>

            <p className="border-t border-zinc-200 pt-2.5 text-[11px] font-semibold text-zinc-500">
              怎么使用
            </p>
            <FormField
              label="用户操作步骤（每行一步）"
              hint="面向普通用户；留空时详情页回退上方编排计划"
            >
              <FormTextarea
                rows={4}
                value={(form.quickStart?.steps ?? []).join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quickStart: { ...form.quickStart, steps: splitLines(e.target.value) },
                  })
                }
              />
            </FormField>
            <FormField label="导入 / 安装说明" hint="展示在详情「怎么使用」">
              <FormTextarea
                rows={3}
                value={form.quickStart?.installGuide ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quickStart: { ...form.quickStart, installGuide: e.target.value },
                  })
                }
              />
            </FormField>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-[#86868b]">常见问题</p>
                  <p className="text-[10px] text-[#86868b]">问题与答案成对展示在「怎么使用」</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      quickStart: {
                        ...current.quickStart,
                        faqs: [...(current.quickStart?.faqs ?? []), { question: '', answer: '' }],
                      },
                    }))
                  }
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <i className="fa-solid fa-plus mr-1 text-[9px]" />
                  添加问题
                </button>
              </div>
              {(form.quickStart?.faqs ?? []).map((faq, index) => (
                <div key={index} className="rounded-xl border border-zinc-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-500">问题 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          quickStart: {
                            ...current.quickStart,
                            faqs: (current.quickStart?.faqs ?? []).filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          },
                        }))
                      }
                      className="text-[10px] font-medium text-zinc-400 hover:text-rose-600"
                    >
                      删除
                    </button>
                  </div>
                  <div className="space-y-2">
                    <FormInput
                      aria-label={`常见问题 ${index + 1}`}
                      placeholder="问题"
                      value={faq.question}
                      onChange={(e) => updateFaq(index, { question: e.target.value })}
                    />
                    <FormTextarea
                      aria-label={`常见问题 ${index + 1} 的答案`}
                      rows={2}
                      placeholder="答案"
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, { answer: e.target.value })}
                    />
                  </div>
                </div>
              ))}
              {form.quickStart?.faqs?.length ? null : (
                <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-3 text-center text-[11px] text-zinc-400">
                  暂未配置常见问题
                </p>
              )}
            </div>

            <p className="border-t border-zinc-200 pt-2.5 text-[11px] font-semibold text-zinc-500">
              维护信息
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="当前版本">
                <FormInput
                  value={form.version ?? ''}
                  placeholder="V1.0"
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </FormField>
              <FormField label="维护团队">
                <FormInput
                  value={form.maintainer ?? ''}
                  placeholder="如 MSS 质量与运营"
                  onChange={(e) => setForm({ ...form, maintainer: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="版本说明" hint="展示在详情「版本」与右侧关键状态">
              <FormTextarea
                rows={2}
                placeholder="本版本新增能力、修复与适用范围变化"
                value={form.versionSummary ?? ''}
                onChange={(e) => setForm({ ...form, versionSummary: e.target.value })}
              />
            </FormField>
          </div>
        </details>
        <details className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-semibold text-zinc-700">
            详情页 · 案例与方案包
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-zinc-600">案例列表</p>
                <p className="text-[10px] text-zinc-400">对应 Agent Hub「案例与方案包」中的业务案例</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    cases: [...(current.cases ?? []), { title: '' }],
                  }))
                }
                className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <i className="fa-solid fa-plus mr-1 text-[9px]" />
                添加案例
              </button>
            </div>
            {(form.cases ?? []).map((item, index) => (
              <div key={index} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500">案例 {index + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        cases: (current.cases ?? []).filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      }))
                    }
                    className="text-[10px] font-medium text-zinc-400 hover:text-rose-600"
                  >
                    删除
                  </button>
                </div>
                <FormField label="案例标题">
                  <FormInput
                    value={item.title}
                    placeholder="例：区域经营数据周报生成"
                    onChange={(e) => updateCase(index, { title: e.target.value })}
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="案例场景">
                    <FormInput
                      value={item.scenario ?? ''}
                      placeholder="例：经营分析"
                      onChange={(e) => updateCase(index, { scenario: e.target.value })}
                    />
                  </FormField>
                  <FormField label="适用对象">
                    <FormInput
                      value={item.audience ?? ''}
                      placeholder="例：区域运营经理"
                      onChange={(e) => updateCase(index, { audience: e.target.value })}
                    />
                  </FormField>
                </div>
                <FormField label="使用前问题">
                  <FormTextarea
                    rows={2}
                    value={item.problem ?? ''}
                    onChange={(e) => updateCase(index, { problem: e.target.value })}
                  />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="样例输入">
                    <FormTextarea
                      rows={3}
                      value={item.input ?? ''}
                      onChange={(e) => updateCase(index, { input: e.target.value })}
                    />
                  </FormField>
                  <FormField label="样例输出">
                    <FormTextarea
                      rows={3}
                      value={item.output ?? ''}
                      onChange={(e) => updateCase(index, { output: e.target.value })}
                    />
                  </FormField>
                </div>
                <FormField label="效果说明">
                  <FormTextarea
                    rows={2}
                    value={item.outcome ?? ''}
                    onChange={(e) => updateCase(index, { outcome: e.target.value })}
                  />
                </FormField>
                <FormField label="关联资源链接">
                  <FormInput
                    value={item.resourceUrl ?? ''}
                    placeholder="https:// 或站内相对地址"
                    onChange={(e) => updateCase(index, { resourceUrl: e.target.value })}
                  />
                </FormField>
              </div>
            ))}
            {form.cases?.length ? null : (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-4 text-center text-[11px] text-zinc-400">
                暂未配置业务案例
              </p>
            )}
          </div>
        </details>
        <details className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5">
          <summary className="cursor-pointer text-[12px] font-semibold text-zinc-700">
            详情页 · 运行环境与入口
          </summary>
          <div className="mt-3 space-y-3">
            <FormField
              label="适配平台（每行一个）"
              hint={`Agent Hub 顶部筛选与关键状态使用；建议：${AGENT_PLATFORM_PRESETS.join('、')}`}
            >
              <FormTextarea
                rows={3}
                value={(form.environment?.platforms ?? []).join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    environment: { ...form.environment, platforms: splitLines(e.target.value) },
                  })
                }
              />
            </FormField>
            <FormField label="使用方式（每行一个）" hint="如平台在线使用、员工助手导入、本地执行包">
              <FormTextarea
                rows={3}
                value={(form.environment?.usageModes ?? []).join('\n')}
                onChange={(e) =>
                  setForm({
                    ...form,
                    environment: { ...form.environment, usageModes: splitLines(e.target.value) },
                  })
                }
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="是否需要代码能力">
                <FormSelect
                  value={
                    form.environment?.requiresCode === undefined
                      ? ''
                      : form.environment.requiresCode
                        ? 'yes'
                        : 'no'
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      environment: {
                        ...form.environment,
                        requiresCode:
                          e.target.value === '' ? undefined : e.target.value === 'yes',
                      },
                    })
                  }
                >
                  <option value="">— 未配置 —</option>
                  <option value="no">不需要</option>
                  <option value="yes">需要</option>
                </FormSelect>
              </FormField>
              <FormField label="是否支持员工助手导入">
                <FormSelect
                  value={
                    form.environment?.supportsAssistantImport === undefined
                      ? ''
                      : form.environment.supportsAssistantImport
                        ? 'yes'
                        : 'no'
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      environment: {
                        ...form.environment,
                        supportsAssistantImport:
                          e.target.value === '' ? undefined : e.target.value === 'yes',
                      },
                    })
                  }
                >
                  <option value="">— 未配置 —</option>
                  <option value="yes">支持</option>
                  <option value="no">暂不支持</option>
                </FormSelect>
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="环境要求（每行一条）">
                <FormTextarea
                  rows={3}
                  value={(form.environment?.requirements ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      environment: {
                        ...form.environment,
                        requirements: splitLines(e.target.value),
                      },
                    })
                  }
                />
              </FormField>
              <FormField label="配置要求（每行一条）">
                <FormTextarea
                  rows={3}
                  value={(form.environment?.configuration ?? []).join('\n')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      environment: {
                        ...form.environment,
                        configuration: splitLines(e.target.value),
                      },
                    })
                  }
                />
              </FormField>
            </div>
            <FormField label="执行包复用说明" hint="展示在「案例与方案包」，也作为安装说明兜底">
              <FormTextarea
                rows={3}
                value={form.environment?.packageGuide ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    environment: { ...form.environment, packageGuide: e.target.value },
                  })
                }
              />
            </FormField>
            <FormField label="安装命令" hint="配置后详情右侧可一键复制">
              <FormInput
                className="font-mono text-[12px]"
                value={form.installCommand ?? ''}
                placeholder="npm install ..."
                onChange={(e) => setForm({ ...form, installCommand: e.target.value })}
              />
            </FormField>
            <FormField label="反馈入口" hint="留空时详情页复制反馈模板；配置后打开该链接">
              <FormInput
                value={form.feedbackUrl ?? ''}
                placeholder="https://"
                onChange={(e) => setForm({ ...form, feedbackUrl: e.target.value })}
              />
            </FormField>
          </div>
        </details>
        <FormField
          label="成熟度状态"
          hint="决定详情页顶部状态标签与主按钮；「可运行」为立即体验，「建设中」为查看 Demo"
        >
          <FormSelect
            value={resolveAgentLifecycle(form)}
            onChange={(e) =>
              setForm({ ...form, lifecycleStatus: e.target.value as AgentLifecycleStatus })
            }
          >
            {AGENT_LIFECYCLE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} — {opt.hint}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField
          label="Demo 入口"
          hint="建设中 Agent 的主按钮「查看 Demo」指向该链接；留空则降级为方案文档"
        >
          <FormInput
            value={form.demoUrl ?? ''}
            placeholder="https://"
            onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
          />
        </FormField>
        <FormField
          label="方案文档入口"
          hint="解决方案 PPT / Word 链接；无 Demo 时作为主按钮兜底"
        >
          <FormInput
            value={form.solutionDocUrl ?? ''}
            placeholder="https://"
            onChange={(e) => setForm({ ...form, solutionDocUrl: e.target.value })}
          />
        </FormField>
        <FormField
          label="Agent 执行包"
          hint={`上传 .zip（≤${PACKAGE_UPLOAD_MAX_LABEL}）；详情页「案例与方案包」将解压展示完整目录树，「下载执行包」下发该原包`}
        >
          <div className="space-y-2">
            <input
              type="file"
              accept=".zip,application/zip"
              disabled={uploadingPackage}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void uploadPackage(file);
              }}
              className="block w-full text-[12px] file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white"
            />
            {uploadingPackage ? (
              <p className="text-[11px] text-zinc-500">
                <i className="fa-solid fa-spinner fa-spin mr-1" />
                上传中…
              </p>
            ) : null}
            {form.packageBlob ? (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-2.5 py-1.5">
                <i className="fa-solid fa-file-zipper text-[12px] text-zinc-500" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-700">
                  {form.packageBlob.name}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                  {formatPackageSize(form.packageBlob.size)}
                </span>
                <button
                  type="button"
                  onClick={removePackageBlob}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  移除
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-400">
                未上传时，「下载执行包」下发前端即时生成的资源包（AGENT.md、编排计划、演示提示词）。
              </p>
            )}
          </div>
        </FormField>
        <FormField
          label="挂载 Skill"
          hint={`实时读取「配置Skill」目录（共 ${skills.length} 个）；勾选后可编排，主 Skill 决定默认 /指令`}
        >
          <div className="mt-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                placeholder="搜索 Skill 名称 / 指令…"
                className="min-w-[160px] flex-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-800"
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-zinc-600">
                <input
                  type="checkbox"
                  className="accent-claw-600"
                  checked={onlyPublishedSkills}
                  onChange={(e) => setOnlyPublishedSkills(e.target.checked)}
                />
                仅可调用
              </label>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setAppView('skills');
                }}
                className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
              >
                去配置 Skill
              </button>
            </div>
            {missingMountedIds.length ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                已挂载但目录中不存在：{missingMountedIds.join('、')}（可能已在配置 Skill
                中删除，请取消勾选或重建）
              </p>
            ) : null}
            <div className="max-h-56 overflow-y-auto rounded-xl border border-black/8 p-2">
              {mountableSkills.length ? (
                mountableSkills.map((s) => {
                  const selected = form.skillIds.includes(s.id);
                  const isPrimary = form.primarySkillId === s.id;
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 border-b border-black/[0.04] py-1.5 last:border-0',
                        selected && 'bg-zinc-50/80',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-claw-600"
                        checked={selected}
                        onChange={() => toggleSkill(s.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-zinc-800">
                          {skillDisplayName(s)}
                        </span>
                        <span className="mono block truncate text-[10px] text-claw-600">
                          {s.command}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold',
                          s.published
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {s.published ? '可调用' : '已沉淀'}
                      </span>
                      {isPrimary ? (
                        <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                          主
                        </span>
                      ) : selected ? (
                        <button
                          type="button"
                          className="shrink-0 text-[9px] text-zinc-400 hover:text-sky-700"
                          onClick={(e) => {
                            e.preventDefault();
                            setForm({ ...form, primarySkillId: s.id });
                          }}
                        >
                          设为主
                        </button>
                      ) : null}
                    </label>
                  );
                })
              ) : (
                <div className="space-y-2 p-3 text-center">
                  <p className="text-[12px] text-[#86868b]">
                    {skills.length
                      ? '无匹配的 Skill，请调整搜索条件'
                      : '配置 Skill 目录为空，请先创建 Skill'}
                  </p>
                  {!skills.length ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        setAppView('skills');
                      }}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      打开配置 Skill
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            {form.skillIds.length ? (
              <p className="text-[10px] text-zinc-400">
                已挂载 {form.skillIds.length} 个
                {form.primarySkillId
                  ? ` · 主 Skill：${
                      skillDisplayName(
                        skills.find((s) => s.id === form.primarySkillId) ?? {
                          id: form.primarySkillId,
                          name: form.primarySkillId,
                          command: '',
                        },
                      )
                    }`
                  : ''}
              </p>
            ) : null}
          </div>
        </FormField>

        <div className="rounded-xl border border-zinc-200 px-3 py-2.5 space-y-2">
          <p className="text-[13px] font-semibold text-zinc-800">发布权限范围</p>
          <p className="text-[11px] text-zinc-500">
            默认公开可见；组织内按成员归属控制；仅发布方用于个人草稿或受限资产。
          </p>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="agent-vis"
              className="accent-claw-600"
              checked={(form.visibility ?? 'public') === 'public'}
              onChange={() => setForm({ ...form, visibility: 'public' })}
            />
            <span className="text-[13px] font-medium text-zinc-800">
              {ASSET_VISIBILITY_LABELS.public}
              <span className="ml-1.5 text-[11px] font-normal text-zinc-400">（默认）</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="agent-vis"
              className="accent-claw-600"
              checked={form.visibility === 'org'}
              onChange={() => setForm({ ...form, visibility: 'org' })}
            />
            <span className="text-[13px] font-medium text-zinc-800">
              {ASSET_VISIBILITY_LABELS.org}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="agent-vis"
              className="accent-claw-600"
              checked={form.visibility === 'private'}
              onChange={() => setForm({ ...form, visibility: 'private' })}
            />
            <span className="text-[13px] font-medium text-zinc-800">
              {ASSET_VISIBILITY_LABELS.private}
            </span>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="accent-claw-600"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          <span className="text-[13px]">提交上架审批（能力上架）</span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 accent-claw-600"
            checked={Boolean(form.featuredInDoTask)}
            onChange={(e) => setForm({ ...form, featuredInDoTask: e.target.checked })}
          />
          <span>
            <span className="block text-[13px] font-medium text-zinc-800">
              精选露出到「做任务 · 场景专家」
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
              {DO_TASK_FEATURED_HINT}
            </span>
          </span>
        </label>
      </div>
    </CenterModal>
  );
}
