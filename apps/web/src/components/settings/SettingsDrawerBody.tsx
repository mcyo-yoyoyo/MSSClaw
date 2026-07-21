import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getApiBase, LS_API_KEY } from '@/api/client';
import { isSystemAdmin } from '@/domain/currentUser';
import { canConfigureModelApi } from '@/domain/permissions';
import { loadSecurityPolicy, saveSecurityPolicy } from '@/domain/securityPolicy';
import { loadWarroomWebhookUrl, saveWarroomWebhookUrl } from '@/domain/webhookConfig';
import { useAppViewStore } from '@/stores/appViewStore';
import { useLlmConfigStore } from '@/stores/llmConfigStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useSessionStore } from '@/stores/sessionStore';

interface SettingsDrawerBodyProps {
  onClose: () => void;
}

function SettingsCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="apple-card p-4">
      <h3 className="section-label mb-1">{title}</h3>
      {hint ? <p className="mb-3 text-[11px] leading-relaxed text-[#86868b]">{hint}</p> : null}
      {children}
    </div>
  );
}

/**
 * 偏好设置：个人级配置。
 * 菜单展示 / 成员 / 租户等治理项不在此，由超级管理员在对应页面配置，其他人只消费结果。
 */
export function SettingsDrawerBody({ onClose }: SettingsDrawerBodyProps) {
  const setAppView = useAppViewStore((s) => s.setAppView);
  const role = useSessionStore((s) => s.user?.platformRole);
  const isAdmin = isSystemAdmin(role);
  const showModelApi = canConfigureModelApi(role);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const { statusLabel, openSettings: openLlmSettings } = useLlmConfigStore();
  const llmStatus = statusLabel();

  const [security, setSecurity] = useState(loadSecurityPolicy);
  const [apiInput, setApiInput] = useState(
    () => localStorage.getItem(LS_API_KEY) || getApiBase() || 'http://localhost:3000',
  );
  const [webhookInput, setWebhookInput] = useState(() => loadWarroomWebhookUrl());

  const patchSecurity = (patch: Partial<typeof security>) => {
    const next = { ...security, ...patch };
    setSecurity(next);
    saveSecurityPolicy(patch);
    showToast('安全策略已保存');
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

  const goAdmin = (view: 'presentation' | 'admin' | 'workspace-config') => {
    setAppView(view);
    onClose();
  };

  return (
    <div className="space-y-4 pb-2">
      <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-600">
        {showModelApi
          ? '这里是你的个人偏好（模型等）。侧栏菜单由超级管理员在「展示配置」统一设定，其他人按配置使用。'
          : '当前为只读访客：可浏览案例与任务结果。侧栏菜单由超级管理员统一设定。'}
      </p>

      {showModelApi ? (
        <SettingsCard title="模型 API" hint="仅影响当前浏览器中的对话调用，不改变他人配置。">
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
      ) : null}

      {isAdmin ? (
        <>
          <SettingsCard
            title="平台治理"
            hint="仅超级管理员可写。其他人通过侧栏消费你配置后的菜单与成员。"
          >
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => goAdmin('presentation')}
                className="flow-link-btn w-full py-2.5 text-[12px] font-semibold"
              >
                展示配置（侧栏菜单）
              </button>
              <button
                type="button"
                onClick={() => goAdmin('admin')}
                className="flow-link-btn w-full py-2.5 text-[12px] font-semibold"
              >
                组织权限（成员）
              </button>
              <button
                type="button"
                onClick={() => goAdmin('workspace-config')}
                className="flow-link-btn w-full py-2.5 text-[12px] font-semibold"
              >
                租户配置（数据空间）
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="安全策略" hint="作用于本机演示环境的全局开关。">
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

          <SettingsCard title="Runtime" hint="演示环境后端地址与作战室推送。">
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
        </>
      ) : null}
    </div>
  );
}
