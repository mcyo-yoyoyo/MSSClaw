import { writeAppRouteToLocation } from '@/domain/appRoute';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';

/** Pages 子路径部署时需带 base（如 /MSSClaw/）；Vercel 根路径则为 / */
const baseBrand = `${import.meta.env.BASE_URL}brand/`.replace(/([^:]\/)\/+/g, '$1');
const LOGIN_HERO_WEBP = `${baseBrand}login-hero.webp`;
const LOGIN_HERO_JPG = `${baseBrand}login-hero.jpg`;

/**
 * 全屏底图 + 右侧内容柱：品牌文案与登录卡同落在负空间，左侧留给插画。
 * 游客模式下这里不再是必经关卡，仅作为 #/login 直达页与启动兜底。
 */
export function LoginPage() {
  const enterGuest = useSessionStore((s) => s.enterGuest);

  const browseAsGuest = () => {
    enterGuest();
    writeAppRouteToLocation({ view: 'home' }, true);
    useAppViewStore.getState().setAppView('home');
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f4f4f6]">
      <picture>
        <source srcSet={LOGIN_HERO_WEBP} type="image/webp" />
        <img
          src={LOGIN_HERO_JPG}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[16%_center] select-none"
          draggable={false}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
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
              <span className="home-slogan-gradient">MSS AI提效平台</span>
            </h1>
            <p className="mt-3.5 max-w-[30rem] text-[13px] leading-6 text-zinc-600 md:text-[14px] md:leading-7">
              前沿洞察开眼界，培训学院提能力，场景案例可复制；专家与技能可下载学习、按需落地，让个人行动沉淀组织能力，提效看得见、用得上！
            </p>
          </header>

          <LoginForm
            className="space-y-4 rounded-2xl border border-zinc-200/80 bg-white/92 p-7 shadow-[0_18px_50px_-28px_rgba(24,24,27,0.45)] backdrop-blur-md md:space-y-5 md:p-8"
            footer={
              <button
                type="button"
                onClick={browseAsGuest}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-[13px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                以游客身份浏览
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
