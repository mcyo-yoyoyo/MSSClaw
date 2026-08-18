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
  AGENT_LIFECYCLE_OPTIONS,
  resolveAgentLifecycle,
  type AgentLifecycleStatus,
} from '@/domain/agentLifecycle';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { ASSET_VISIBILITY_LABELS, type AssetVisibility } from '@/domain/orgTaxonomy';
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
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { shareSyncSaveHint } from '@/domain/shareSync';
import {
  AGENT_AVATAR_PRESETS,
  DEFAULT_AGENT_AVATAR_PRESET_ID,
} from '@/domain/agentAvatars';
import { AgentPortrait } from '@/components/brand/AgentPortrait';
import { cn } from '@/lib/utils';

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

export function AgentEditorModal({ target, onClose }: AgentEditorModalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const upsertAgent = useMarketplaceStore((s) => s.upsertAgent);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const hydrateBusinessCatalog = useBusinessScenarioCatalogStore((s) => s.hydrate);
  const [form, setForm] = useState<PrototypeAgentSeed>(emptyAgent());
  const [skillQuery, setSkillQuery] = useState('');
  const [onlyPublishedSkills, setOnlyPublishedSkills] = useState(false);
  const businessOptions = useMemo(() => listVisibleBusinessScenarioCategories(), []);

  useEffect(() => {
    hydrateBusinessCatalog();
  }, [hydrateBusinessCatalog]);

  useEffect(() => {
    if (!target) return;
    setSkillQuery('');
    setOnlyPublishedSkills(false);
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
  const title = isNew ? '创建 Agent' : '编辑 Agent';

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

  const handleSave = () => {
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
    const prev = !isNew ? agents.find((a) => a.id === target) : null;
    const id = isNew ? `agent-${Date.now()}` : (target as string);
    const needsApproval = isNew || (form.published && !prev?.published);
    const planSteps = (form.planSteps ?? []).map((s) => s.trim()).filter(Boolean);
    const visibility: AssetVisibility =
      form.visibility === 'org' || form.visibility === 'private' ? form.visibility : 'public';
    const businessScenarioId = form.businessScenarioId as BusinessScenarioId;
    const scenarioLabel = getBusinessScenarioMeta(businessScenarioId).label;
    upsertAgent(
      {
        ...form,
        id,
        name,
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
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSave} />}
    >
      <div className="space-y-3 text-left">
        <FormField
          label="数字员工形象"
          hint="系统提供 20 套真人卡通数字员工形象；也可上传自定义头像（PNG/JPG/WebP，≤512KB）"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <AgentPortrait
                agentId={form.id || 'new'}
                name={form.name || 'Agent'}
                icon={form.icon}
                avatarUrl={form.avatarUrl}
                avatarPresetId={form.avatarPresetId}
                size={52}
                className="rounded-2xl ring-1 ring-zinc-200"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="block w-full text-[12px] text-zinc-600 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    void readAvatarFile(file)
                      .then((dataUrl) => {
                        setForm({
                          ...form,
                          avatarUrl: dataUrl,
                          avatarPresetId: undefined,
                        });
                        showToast('自定义头像已上传');
                      })
                      .catch((err: Error) => showToast(err.message || '上传失败'));
                  }}
                />
                {form.avatarUrl ? (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800"
                    onClick={() =>
                      setForm({
                        ...form,
                        avatarUrl: undefined,
                        avatarPresetId: form.avatarPresetId || DEFAULT_AGENT_AVATAR_PRESET_ID,
                      })
                    }
                  >
                    清除上传，改用系统预设
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {AGENT_AVATAR_PRESETS.map((p) => {
                const active = !form.avatarUrl && form.avatarPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={`${p.label} · ${p.hint}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        avatarPresetId: p.id,
                        avatarUrl: undefined,
                      })
                    }
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border p-1.5 transition',
                      active
                        ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                        : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
                    )}
                  >
                    <img
                      src={p.src}
                      alt={p.label}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <span className="truncate text-[9px] font-medium text-zinc-600">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </FormField>
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
                planSteps: e.target.value
                  .split('\n')
                  .map((s) => s.trimEnd())
                  .filter((s) => s.trim().length > 0),
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
                  onClose();
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
                        onClose();
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
            默认公开可见。组织内：后续按观众归属匹配；公开可见：全领域全区域可看。短期两者浏览效果相同。
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
