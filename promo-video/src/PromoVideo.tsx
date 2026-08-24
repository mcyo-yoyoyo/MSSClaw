import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AnswerStream, type AnswerCard } from "@/components/snap-cn/answer-stream";
import { HeroLaunch } from "@/components/snap-cn/hero-launch";
import { LaptopFrame } from "@/components/snap-cn/laptop-frame";
import { LogoAssemble } from "@/components/snap-cn/logo-assemble";
import { SearchTyping } from "@/components/snap-cn/search-typing";
import { TextHighlight } from "@/components/snap-cn/text-highlight";
import { TextReveal } from "@/components/snap-cn/text-reveal";
import type { SnapCnTheme } from "@/lib/snap-cn-ui";

export const PROMO_FPS = 30;

const SHOTS = {
  hook: 90,
  positioning: 170,
  product: 190,
  prompt: 180,
  answer: 160,
  proof: 180,
  takeaway: 90,
  outro: 120,
} as const;

export const PROMO_DURATION_IN_FRAMES = Object.values(SHOTS).reduce(
  (sum, frames) => sum + frames,
  0,
);

const FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Segoe UI", sans-serif';

const COLORS = {
  ink: "#121214",
  paper: "#f4f3f1",
  white: "#ffffff",
  red: "#e0122f",
  redDark: "#8d071f",
  muted: "#68686f",
  line: "#deddd9",
} as const;

const SNAP_THEME: Partial<SnapCnTheme> = {
  background: COLORS.paper,
  foreground: COLORS.ink,
  card: COLORS.white,
  cardForeground: COLORS.ink,
  primary: COLORS.red,
  primaryForeground: COLORS.white,
  secondary: "#ebe9e5",
  secondaryForeground: COLORS.ink,
  muted: "#ebe9e5",
  mutedForeground: COLORS.muted,
  border: COLORS.line,
  input: "#d8d6d1",
  ring: COLORS.red,
  accent: "#f6d9df",
  accentForeground: COLORS.redDark,
};

const DARK_THEME: Partial<SnapCnTheme> = {
  ...SNAP_THEME,
  background: "#09090b",
  foreground: COLORS.white,
  card: "#17171b",
  cardForeground: COLORS.white,
  muted: "#242429",
  mutedForeground: "#a5a5ad",
  border: "#2d2d33",
  input: "#34343a",
};

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const screen = (name: string) => `/screens/${name}`;

function DotGrid({ dark = false }: { dark?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        opacity: dark ? 0.16 : 0.34,
        backgroundImage: `radial-gradient(circle, ${
          dark ? "rgba(255,255,255,0.16)" : "rgba(18,18,20,0.13)"
        } 1px, transparent 1.2px)`,
        backgroundSize: "22px 22px",
      }}
    />
  );
}

function BrandBug({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 34,
        top: 28,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: dark ? COLORS.white : COLORS.ink,
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 650,
        letterSpacing: "-0.02em",
        zIndex: 20,
      }}
    >
      <Img
        src={staticFile("brand/mss-mark.svg")}
        style={{ width: 28, height: 28 }}
      />
      MSS AI提效平台
    </div>
  );
}

function Pill({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 30,
        padding: "0 13px",
        borderRadius: 999,
        border: `1px solid ${dark ? "rgba(255,255,255,0.16)" : COLORS.line}`,
        background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.84)",
        color: dark ? "#d7d7dc" : COLORS.muted,
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sub = spring({
    frame: frame - 48,
    fps,
    config: { damping: 22, stiffness: 120, mass: 0.8 },
    durationInFrames: 24,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.ink,
        color: COLORS.white,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <DotGrid dark />
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          left: -110,
          top: 390,
          background: "rgba(224,18,47,0.16)",
          filter: "blur(22px)",
        }}
      />
      <BrandBug dark />
      <TextReveal
        text="AI 能力，不该散落各处"
        fontSize={76}
        color={COLORS.white}
        mode="dark"
        theme={DARK_THEME}
        initialScale={1.85}
        holdDuration={10}
        recedeDuration={14}
        assembleDuration={28}
        wordDelay={6}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 92,
          display: "flex",
          justifyContent: "center",
          opacity: sub,
          transform: `translateY(${interpolate(sub, [0, 1], [16, 0])}px)`,
        }}
      >
        <Pill dark>从工作场景出发，找到正确能力</Pill>
      </div>
    </AbsoluteFill>
  );
}

function PositioningScene() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      <HeroLaunch
        heading="从场景发现，到能力落地"
        image1={screen("home.png")}
        image2={screen("brief-overview.png")}
        theme={DARK_THEME}
        mode="dark"
      />
    </AbsoluteFill>
  );
}

function ProductScene() {
  const frame = useCurrentFrame();
  const titleIn = spring({
    frame: frame - 32,
    fps: PROMO_FPS,
    config: { damping: 24, stiffness: 130 },
    durationInFrames: 26,
  });
  const titleOut = interpolate(frame, [118, 136], [1, 0], CLAMP);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        color: COLORS.ink,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <DotGrid />
      <LaptopFrame
        screenSrc={screen("home.png")}
        entrance="open"
        finale="zoom-to-screen"
        showNotch={false}
        scale={0.88}
        floatLoop
        floatAmplitude={3}
        screenColor={COLORS.white}
        theme={SNAP_THEME}
        mode="light"
      />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          left: 64,
          bottom: 62,
          width: 455,
          opacity: titleIn * titleOut,
          transform: `translateY(${interpolate(titleIn, [0, 1], [18, 0])}px)`,
          zIndex: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 38,
            lineHeight: 1.12,
            letterSpacing: "-0.035em",
            fontWeight: 700,
          }}
        >
          一个入口，连接正确能力
        </h2>
        <p
          style={{
            margin: "12px 0 0",
            color: COLORS.muted,
            fontSize: 16,
            lineHeight: 1.6,
          }}
        >
          外部精选 · 内部办公 · AI ToolHub
        </p>
      </div>
    </AbsoluteFill>
  );
}

function PromptScene() {
  const frame = useCurrentFrame();
  const captionIn = spring({
    frame: frame - 12,
    fps: PROMO_FPS,
    config: { damping: 22, stiffness: 125 },
    durationInFrames: 24,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        color: COLORS.ink,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <DotGrid />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 92,
          textAlign: "center",
          opacity: captionIn,
          transform: `translateY(${interpolate(captionIn, [0, 1], [12, 0])}px)`,
          zIndex: 8,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.035em" }}>
          从一个真实任务开始
        </div>
        <div style={{ marginTop: 10, fontSize: 15, color: COLORS.muted }}>
          选择已上架的 Skill 或 Agent，确认计划后再执行
        </div>
      </div>
      <SearchTyping
        text="将这份中文 PPT 翻译成拉美西语，保留版式和术语"
        charsPerSecond={17}
        humanize={0.22}
        wordPause={1.25}
        punctuationPause={1.7}
        startDelay={0.75}
        dollyDuration={0.8}
        panDuration={0.5}
        holdAfter={0.85}
        recedeDuration={1.15}
        fieldHeight={0.2}
        frontVisible={0.62}
        edgeInset={58}
        surface="shadcn"
        mode="light"
        theme={SNAP_THEME}
        icon="sparkle"
        fontFamily={FONT}
        fontWeight={500}
        seed="mss-translate-prompt"
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 52,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pill>小语种翻译 Skill · 任务演示</Pill>
      </div>
    </AbsoluteFill>
  );
}

const ANSWER_CARDS: AnswerCard[] = [
  {
    title: "准备文件",
    body: "检查 PPTX 结构与可编辑元素",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6",
  },
  {
    title: "术语对齐",
    body: "应用品牌术语与区域表达",
    icon: "M4 7h16M7 4v6M17 14v6M4 17h16",
  },
  {
    title: "生成译稿",
    body: "保留版式并输出可下载结果",
    icon: "M20 6 9 17l-5-5M14 6h6v6",
  },
];

function AnswerScene() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper, fontFamily: FONT }}>
      <AnswerStream
        question="将中文 PPT 翻译成拉美西语，保留版式和术语"
        answer={
          "已识别 24 页内容 与双术语表。\n正在保留版式 完成拉美西语翻译，并生成可下载结果。"
        }
        headline="执行计划已确认，过程与交付物清晰可见"
        cards={ANSWER_CARDS}
        model="MSS AI"
        commitAt={0.82}
        cutAt={1.12}
        pullbackAt={1.72}
        pullbackDuration={1.05}
        wordsPerSecond={18}
        coolSeconds={0.2}
        accentColor={COLORS.red}
        theme={SNAP_THEME}
        mode="light"
      />
      <div style={{ position: "absolute", right: 28, top: 24, zIndex: 30 }}>
        <Pill>任务演示</Pill>
      </div>
    </AbsoluteFill>
  );
}

interface ProofShot {
  src: string;
  label: string;
}

const PROOF_SHOTS: ProofShot[] = [
  { src: "translate-overview.png", label: "能力总览" },
  { src: "translate-quickstart.png", label: "快速上手" },
  { src: "translate-files.png", label: "技能包结构" },
];

function shotOpacity(frame: number, index: number, duration: number) {
  const slot = duration / PROOF_SHOTS.length;
  const start = index * slot;
  const end = (index + 1) * slot;
  const fade = 10;
  return interpolate(
    frame,
    [start - fade, start + fade, end - fade, end + fade],
    [0, 1, 1, 0],
    CLAMP,
  );
}

function ProofScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copyIn = spring({
    frame: frame - 8,
    fps,
    config: { damping: 24, stiffness: 120 },
    durationInFrames: 26,
  });
  const slot = SHOTS.proof / PROOF_SHOTS.length;
  const active = Math.min(PROOF_SHOTS.length - 1, Math.floor(frame / slot));

  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        color: COLORS.ink,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <DotGrid />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 158,
          width: 330,
          opacity: copyIn,
          transform: `translateY(${interpolate(copyIn, [0, 1], [18, 0])}px)`,
        }}
      >
        <Pill>真实产品截图</Pill>
        <h2
          style={{
            margin: "24px 0 0",
            fontSize: 48,
            lineHeight: 1.08,
            letterSpacing: "-0.045em",
          }}
        >
          好的方法，
          <br />
          沉淀下来
        </h2>
        <p
          style={{
            margin: "20px 0 0",
            color: COLORS.muted,
            fontSize: 17,
            lineHeight: 1.7,
          }}
        >
          从能力说明、快速上手到技能包结构，
          <br />
          让 Skill 可理解、可下载、可复用。
        </p>
        <div style={{ marginTop: 28, display: "flex", gap: 8 }}>
          {PROOF_SHOTS.map((shot, index) => (
            <div
              key={shot.src}
              style={{
                width: index === active ? 36 : 8,
                height: 8,
                borderRadius: 999,
                background: index === active ? COLORS.red : "#c9c7c2",
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 12, color: COLORS.red, fontSize: 14, fontWeight: 650 }}>
          {PROOF_SHOTS[active].label}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 450,
          top: 128,
          width: 770,
          height: 440,
          overflow: "hidden",
          borderRadius: 18,
          background: COLORS.white,
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 22px 58px rgba(18,18,20,0.16)",
        }}
      >
        {PROOF_SHOTS.map((shot, index) => {
          const opacity = shotOpacity(frame, index, SHOTS.proof);
          const start = index * slot;
          const progress = interpolate(frame, [start, start + slot], [0, 1], CLAMP);
          return (
            <Img
              key={shot.src}
              src={staticFile(`screens/${shot.src}`)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity,
                transform: `scale(${1.018 + progress * 0.032}) translateX(${
                  index === 1 ? -5 * progress : 0
                }px)`,
                transformOrigin: index === 2 ? "40% 50%" : "50% 50%",
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function TakeawayScene() {
  const frame = useCurrentFrame();
  const footer = spring({
    frame: frame - 38,
    fps: PROMO_FPS,
    config: { damping: 22, stiffness: 110 },
    durationInFrames: 26,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.white,
        color: COLORS.ink,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <DotGrid />
      <BrandBug />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 40,
        }}
      >
        <TextHighlight
          before="让一次使用，"
          highlight="沉淀为组织能力"
          preset="underline"
          baseColor={COLORS.ink}
          accentColor={COLORS.red}
          highlightedTextColor={COLORS.ink}
          startAt={14}
          drawDuration={18}
          thickness={6}
          fontSize={52}
          fontWeight={720}
          theme={SNAP_THEME}
          mode="light"
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 74,
          textAlign: "center",
          color: COLORS.muted,
          fontSize: 17,
          opacity: footer,
          transform: `translateY(${interpolate(footer, [0, 1], [14, 0])}px)`,
        }}
      >
        让个人提效看得见，让组织能力用得上
      </div>
    </AbsoluteFill>
  );
}

const OUTRO_IMAGES = [
  screen("home.png"),
  screen("brief-overview.png"),
  screen("tool-internal.png"),
  screen("translate-overview.png"),
  screen("translate-files.png"),
  screen("ppt-overview.png"),
  screen("ppt-files.png"),
];

function OutroScene() {
  const frame = useCurrentFrame();
  const tagline = interpolate(frame, [88, 102], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ background: "#09090b", fontFamily: FONT }}>
      <LogoAssemble
        logoSrc="/brand/mss-mark.svg"
        brandName="MSS AI提效平台"
        middleText={"找得到 · 用得上\n沉淀下来"}
        images={OUTRO_IMAGES}
        count={9}
        background="#09090b"
        theme={DARK_THEME}
        mode="dark"
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 62,
          textAlign: "center",
          color: "#b8b8c0",
          fontSize: 15,
          opacity: tagline,
        }}
      >
        企业内部 AI 工作平台 · 场景发现、能力调用与任务交付
      </div>
    </AbsoluteFill>
  );
}

function AudioBed() {
  return (
    <Audio
      src={staticFile("audio/brand-bed.wav")}
      volume={(frame) =>
        interpolate(
          frame,
          [0, 18, PROMO_DURATION_IN_FRAMES - 24, PROMO_DURATION_IN_FRAMES],
          [0, 0.72, 0.72, 0],
          CLAMP,
        )
      }
    />
  );
}

export function PromoVideo() {
  return (
    <AbsoluteFill style={{ background: COLORS.ink }}>
      <AudioBed />
      <Series>
        <Series.Sequence durationInFrames={SHOTS.hook}>
          <HookScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.positioning}>
          <PositioningScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.product}>
          <ProductScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.prompt}>
          <PromptScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.answer}>
          <AnswerScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.proof}>
          <ProofScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.takeaway}>
          <TakeawayScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SHOTS.outro}>
          <OutroScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
