import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getApiBase, LS_API_KEY } from '@/api/client';
import { ROLE_LABELS, type PlatformRole } from '@/domain/rbac';
import { loadSecurityPolicy, saveSecurityPolicy } from '@/domain/securityPolicy';
import { downloadAllSkillsFile } from '@/domain/skillExport';
import { loadWarroomWebhookUrl, saveWarroomWebhookUrl } from '@/domain/webhookConfig';
import { useAppViewStore } from '@/stores/appViewStore';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSettingsStore } from '@/stores/settingsStore';

interface SettingsDrawerBodyProps {
  onClose: () => void;
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="apple-card p-4">
      <h3 className="section-label mb-3">{title}</h3>
      {children}
    </div>
  );
}

function MemberRow({
  name,
  subtitle,
  badge,
}: {
  name: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-xl bg-black/[0.02] p-2.5 last:mb-0">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 text-[10px] font-semibold text-white">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">{name}</p>
          <p className="truncate text-[10px] text-[#86868b]">{subtitle}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-claw-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
        {badge}
      </span>
    </div>
  );
}

export function SettingsDrawerBody({ onClose }: SettingsDrawerBodyProps) {
  const setAppView = useAppViewStore((s) => s.setAppView);
  const { members, inviteMember } = useSettingsStore();
  const { kbDocs, skills, agents, syncKbIndex, showToast } = useMarketplaceStore();
  const { statusLabel, openSettings: openLlmSettings } = useLlmConfigStore();
  const llmStatus = statusLabel();

  const [security, setSecurity] = useState(loadSecurityPolicy);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<PlatformRole>('business_user');
  const [apiInput, setApiInput] = useState(
    () => localStorage.getItem(LS_API_KEY) || getApiBase() || 'http://localhost:3000',
  );
  const [webhookInput, setWebhookInput] = useState(() => loadWarroomWebhookUrl());

  const indexedKb = kbDocs.filter((d) => d.indexed).length;

  const goTo = (view: 'kb' | 'skills') => {
    setAppView(view);
    onClose();
  };

  const exportSkills = () => {
    downloadAllSkillsFile(skills);
    showToast(`Skill 中心已导出（${skills.length} 个）`);
  };

  const patchSecurity = (patch: Partial<typeof security>) => {
    const next = { ...security, ...patch };
    setSecurity(next);
    saveSecurityPolicy(patch);
    showToast('安全策略已保存');
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember(inviteEmail, inviteRole);
    setInviteEmail('');
  };

  const saveApi = () => {
    localStorage.setItem(LS_API_KEY, apiInput.trim());
    showToast('API 地址已保存，后续请求将立即生效');
  };

  const saveWebhook = () => {
    saveWarroomWebhookUrl(webhookInput);
    showToast(webhookInput.trim() ? '作战室 Webhook 已保存' : '已清除 Webhook，将使用本地 Mock 推送');
  };

  const openModelSettings = () => {
    onClose();
    openLlmSettings();
  };

  return (
    <div className="space-y-4 pb-2">
      <SettingsCard title="工作区成员">
        {members.slice(0, 6).map((m) => (
          <MemberRow
            key={m.id}
            name={m.name}
            subtitle={m.email}
            badge={ROLE_LABELS[m.role] ?? m.role}
          />
        ))}
        {members.length > 6 && (
          <p className="mt-2 text-center text-[11px] text-[#86868b]">还有 {members.length - 6} 位成员</p>
        )}
        <form onSubmit={handleInvite} className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
          <label className="block text-[11px] font-semibold text-[#86868b]">邀请成员</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@huawei.com"
            className="w-full rounded-xl border border-black/8 px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as PlatformRole)}
              className="flex-1 rounded-xl border border-black/8 px-3 py-2 text-[12px]"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="apple-btn-primary shrink-0 rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
            >
              邀请
            </button>
          </div>
        </form>
      </SettingsCard>

      <SettingsCard title="知识库">
        <p className="mb-3 text-[12px] leading-relaxed text-[#86868b]">
          {kbDocs.length} 篇文档 · {indexedKb} 篇已索引
        </p>
        <button
          type="button"
          onClick={() => goTo('kb')}
          className="flow-link-btn w-full py-2.5 text-[12px] font-semibold"
        >
          管理知识库
        </button>
        <button
          type="button"
          onClick={() => {
            syncKbIndex();
          }}
          className="flow-link-btn mt-2 w-full py-2.5 text-[12px] font-semibold"
        >
          同步向量索引
        </button>
      </SettingsCard>

      <SettingsCard title="Skill 中心">
        <p className="mb-3 text-[12px] leading-relaxed text-[#86868b]">
          共 {skills.length} 个 Skill · {agents.length} 个 Agent
        </p>
        <button
          type="button"
          onClick={() => goTo('skills')}
          className="flow-link-btn w-full py-2.5 text-[12px] font-semibold"
        >
          管理 Skill 中心
        </button>
        <button
          type="button"
          onClick={exportSkills}
          className="apple-btn-primary mt-2 w-full rounded-xl py-2.5 text-[12px] font-semibold text-white"
        >
          导出 Skill 包
        </button>
      </SettingsCard>

      <SettingsCard title="安全策略">
        <label className="flex cursor-pointer items-center justify-between py-2">
          <span className="text-[13px] text-[#1d1d1f]">PII 自动脱敏</span>
          <input
            type="checkbox"
            checked={security.piiMask}
            onChange={(e) => patchSecurity({ piiMask: e.target.checked })}
            className="accent-claw-600"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between py-2">
          <span className="text-[13px] text-[#1d1d1f]">Agent 审计日志</span>
          <input
            type="checkbox"
            checked={security.auditLog}
            onChange={(e) => patchSecurity({ auditLog: e.target.checked })}
            className="accent-claw-600"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between py-2">
          <span className="text-[13px] text-[#1d1d1f]">Skill 调用白名单</span>
          <input
            type="checkbox"
            checked={security.skillWhitelist}
            onChange={(e) => patchSecurity({ skillWhitelist: e.target.checked })}
            className="accent-claw-600"
          />
        </label>
      </SettingsCard>

      <SettingsCard title="模型 API">
        <p className="mb-3 text-[12px] leading-relaxed text-[#86868b]">
          {llmStatus.configured ? `已配置真实模型 Key · ${llmStatus.text}` : llmStatus.text}
        </p>
        <button
          type="button"
          onClick={openModelSettings}
          className="flow-link-btn w-full py-2.5 text-[12px] font-semibold"
        >
          配置模型 API Key
        </button>
      </SettingsCard>

      <SettingsCard title="Runtime">
        <label className="mb-1 block text-[12px] text-[#86868b]">API 地址（可选）</label>
        <input
          type="text"
          value={apiInput}
          onChange={(e) => setApiInput(e.target.value)}
          className="mono mb-2 w-full rounded-xl border border-black/8 px-3 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          placeholder="http://localhost:3000"
        />
        <button
          type="button"
          onClick={saveApi}
          className={cn('flow-link-btn w-full py-2 text-[12px] font-semibold')}
        >
          保存 API 地址
        </button>
        <label className="mb-1 mt-3 block text-[12px] text-[#86868b]">作战室 Webhook（可选）</label>
        <input
          type="url"
          value={webhookInput}
          onChange={(e) => setWebhookInput(e.target.value)}
          className="mono mb-2 w-full rounded-xl border border-black/8 px-3 py-2 text-[12px] text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          placeholder="https://hooks.example.com/warroom"
        />
        <button
          type="button"
          onClick={saveWebhook}
          className="flow-link-btn w-full py-2 text-[12px] font-semibold"
        >
          保存 Webhook
        </button>
      </SettingsCard>
    </div>
  );
}
