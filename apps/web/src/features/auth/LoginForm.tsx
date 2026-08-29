import { useEffect, useState, type FormEvent } from 'react';
import { loadAuthPolicy } from '@/domain/accountCredentials';
import { DEMO_PASSWORD } from '@/domain/authAccounts';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useSessionStore } from '@/stores/sessionStore';
import { ensureAccountPasswordsReady } from '@/stores/settingsStore';

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e0122f]/15';

interface LoginFormProps {
  /** 登录墙场景下说明「为什么需要登录」 */
  hint?: string;
  title?: string;
  subtitle?: string;
  onSuccess?: () => void | Promise<void>;
  /** 表单下方的次要操作（游客浏览 / 稍后再说） */
  footer?: React.ReactNode;
  className?: string;
}

/** 登录表单：全屏登录页与登录墙浮层共用同一份逻辑 */
export function LoginForm({
  hint,
  title = '登录账号',
  subtitle = '使用组织账号进入工作台',
  onSuccess,
  footer,
  className,
}: LoginFormProps) {
  const login = useSessionStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const demoAllowed = loadAuthPolicy().allowDemoPassword;

  useEffect(() => {
    void ensureAccountPasswordsReady();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) setError(result.error);
      else await onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col items-center text-center">
        <MssZhishuMark size={56} />
        <h2 className="mt-3.5 text-[16px] font-semibold text-zinc-900">{title}</h2>
        <p className="mt-1 text-[12px] text-zinc-500">{subtitle}</p>
      </div>

      {hint ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-[12px] text-zinc-600">
          {hint}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-zinc-500">邮箱账号</span>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="name@huawei.com"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-zinc-500">密码</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="请输入密码"
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#e0122f] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#c01028] disabled:opacity-60"
      >
        {submitting ? '登录中…' : '进入工作台'}
      </button>

      {footer}

      {demoAllowed ? (
        <p className="text-center text-[11px] text-zinc-400">
          当前角色账号初始密码均为{' '}
          <span className="font-mono text-zinc-600">{DEMO_PASSWORD}</span>
          （生产请在组织权限中改密或关闭演示策略）
        </p>
      ) : (
        <p className="text-center text-[11px] text-zinc-400">
          请使用平台运营为您配置的账号密码登录
        </p>
      )}
    </form>
  );
}
