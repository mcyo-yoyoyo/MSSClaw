import { useState, type FormEvent } from 'react';
import { DEMO_PASSWORD } from '@/domain/authAccounts';
import { MssZhishuMark } from '@/components/brand/MssZhishuMark';
import { useSessionStore } from '@/stores/sessionStore';

const LOGIN_HERO = '/brand/login-hero.png';

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#e0122f]/15';

/**
 * 全屏底图 + 右侧内容柱：品牌文案与登录卡同落在负空间，左侧留给插画。
 */
export function LoginPage() {
  const login = useSessionStore((s) => s.login);
  const [email, setEmail] = useState('mcyo@company.com');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = login(email, password);
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f4f4f6]">
      <img
        src={LOGIN_HERO}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[16%_center] select-none"
        draggable={false}
      />
      {/* 右侧轻微提亮，保证文案与表单清晰，不切割整页 */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[min(640px,56%)] bg-gradient-to-l from-white/72 via-white/38 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen w-full items-center justify-end px-5 py-10 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="w-full max-w-[460px] space-y-7 md:max-w-[500px] lg:max-w-[520px]">
          {/* 品牌文案：叠在登录区上方，不压插画 */}
          <header className="login-brand-header text-center md:text-left">
            <p className="mb-2.5 text-[11px] font-semibold tracking-[0.16em] text-zinc-500">
              MSS · AI EFFICIENCY
            </p>
            <h1 className="home-slogan-art">
              <span className="home-slogan-gradient">MSS AI提效作战平台</span>
            </h1>
            <p className="mt-3.5 max-w-[30rem] text-[13px] leading-6 text-zinc-600 md:text-[14px] md:leading-7">
              前沿洞察开眼界，培训学院提能力，场景案例可复制；专家与技能一键打样，让个人行动沉淀组织能力，提效看得见、用得上！
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white/92 p-7 shadow-[0_18px_50px_-28px_rgba(24,24,27,0.45)] backdrop-blur-md md:space-y-5 md:p-8"
          >
            <div className="flex flex-col items-center text-center">
              <MssZhishuMark size={56} />
              <h2 className="mt-3.5 text-[16px] font-semibold text-zinc-900">登录账号</h2>
              <p className="mt-1 text-[12px] text-zinc-500">使用组织账号进入工作台</p>
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

            <p className="text-center text-[11px] text-zinc-400">
              演示密码 <span className="font-mono text-zinc-600">{DEMO_PASSWORD}</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
