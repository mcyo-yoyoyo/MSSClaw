import { useEffect } from 'react';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuthGateStore } from '@/stores/authGateStore';
import { useMarketFavoriteStore } from '@/stores/marketFavoriteStore';

/**
 * 登录墙浮层：游客触发受限动作时就地登录，登录成功后重放原动作，
 * 不跳走整页、不丢当前浏览上下文。
 */
export function AuthGateOverlay() {
  const open = useAuthGateStore((s) => s.open);
  const hint = useAuthGateStore((s) => s.hint);
  const close = useAuthGateStore((s) => s.close);
  const resolveAfterLogin = useAuthGateStore((s) => s.resolveAfterLogin);

  const finishLogin = async () => {
    // 收藏重放前先装入该账号的真实 bucket，避免把游客空内存覆盖到已有收藏文档。
    await useMarketFavoriteStore.getState().hydrate();
    resolveAfterLogin();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="登录"
      onClick={close}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_-24px_rgba(24,24,27,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-4 pt-4">
          <button
            type="button"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="关闭"
          >
            <i className="fa-solid fa-xmark text-[14px]" />
          </button>
        </div>
        <LoginForm
          className="space-y-4 px-7 pb-7"
          hint={hint}
          subtitle="登录后继续当前操作"
          onSuccess={finishLogin}
          footer={
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-[13px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              继续以游客浏览
            </button>
          }
        />
      </div>
    </div>
  );
}
