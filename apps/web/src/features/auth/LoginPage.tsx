import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { DEMO_PASSWORD, getDemoAccountHints } from '@/domain/authAccounts';
import { ROLE_LABELS } from '@/domain/rbac';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useSessionStore } from '@/stores/sessionStore';

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';

export function LoginPage() {
  const login = useSessionStore((s) => s.login);
  const [email, setEmail] = useState('mcyo@company.com');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hints = getDemoAccountHints();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = login(email, password);
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="home-surface flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <header className="mb-8 text-center">
          <div className="home-hero-mark mb-4">
            <MssZhishuMark size={64} />
          </div>
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS AI提效作战平台，好学又好用！</span>
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-zinc-500">
            集成多位数字员工，7*24小时随时待命，帮你实现个人提效，助力MSS实现组织提效！
          </p>
        </header>

        <form onSubmit={handleSubmit} className="apple-card space-y-4 p-6">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">登录 MSS AI提效作战平台</h2>
            <p className="mt-1 text-[12px] text-zinc-500">使用成员权限管理中的账号进入工作台</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-zinc-500">邮箱账号</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="name@company.com"
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

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="apple-btn-primary w-full rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {submitting ? '登录中…' : '进入工作台'}
          </button>

          <p className="text-center text-[11px] text-zinc-400">
            演示密码统一为 <span className="font-mono text-zinc-600">{DEMO_PASSWORD}</span>
          </p>
        </form>

        <div className="mt-5">
          <p className="mb-2 text-center text-[11px] font-medium text-zinc-400">快速填入演示账号</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {hints.map((hint) => (
              <button
                key={hint.email}
                type="button"
                onClick={() => {
                  setEmail(hint.email);
                  setPassword(DEMO_PASSWORD);
                  setError('');
                }}
                className={cn(
                  'rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 transition',
                  'hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900',
                )}
                title={hint.orgLabel ? `${hint.email} · ${hint.orgLabel}` : hint.email}
              >
                {hint.name}
                <span className="ml-1 text-zinc-400">· {ROLE_LABELS[hint.role]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
