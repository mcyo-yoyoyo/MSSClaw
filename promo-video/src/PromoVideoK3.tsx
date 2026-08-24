import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TextHighlight } from "@/components/snap-cn/text-highlight";
import { TextReveal } from "@/components/snap-cn/text-reveal";
import { TextSwap } from "@/components/snap-cn/text-swap";
import type { SnapCnTheme } from "@/lib/snap-cn-ui";

export const K3_PROMO_FPS = 30;

export const K3_SHOT_DURATIONS = [
  90, 150, 120, 150, 90, 120, 90, 150, 90, 120, 120, 90, 120, 90, 120,
  120, 120, 150,
] as const;

export const K3_PROMO_DURATION_IN_FRAMES = K3_SHOT_DURATIONS.reduce(
  (sum, duration) => sum + duration,
  0,
);

const FONT =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Segoe UI", sans-serif';

const COLORS = {
  ink: "#111315",
  charcoal: "#26292a",
  paper: "#f4f3ee",
  warmWhite: "#fbfaf6",
  white: "#ffffff",
  red: "#d91f35",
  redDeep: "#9f1427",
  blue: "#5575a7",
  blueSoft: "#dfe6f2",
  grayGreen: "#d9ddd5",
  muted: "#6f7372",
  line: "#d7d8d3",
} as const;

const LIGHT_THEME: Partial<SnapCnTheme> = {
  background: COLORS.paper,
  foreground: COLORS.ink,
  card: COLORS.white,
  cardForeground: COLORS.ink,
  primary: COLORS.red,
  primaryForeground: COLORS.white,
  secondary: COLORS.grayGreen,
  secondaryForeground: COLORS.ink,
  muted: "#ebeae4",
  mutedForeground: COLORS.muted,
  border: COLORS.line,
  input: COLORS.line,
  ring: COLORS.red,
  accent: "#f2dce0",
  accentForeground: COLORS.redDeep,
};

const DARK_THEME: Partial<SnapCnTheme> = {
  ...LIGHT_THEME,
  background: COLORS.ink,
  foreground: COLORS.white,
  card: COLORS.charcoal,
  cardForeground: COLORS.white,
  muted: "#2d3030",
  mutedForeground: "#b7bab8",
  border: "#383b3b",
};

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const screen = (name: string) => staticFile(`screens/${name}`);

type HighlightRect = {
  left: string;
  top: string;
  width: string;
  height: string;
  delay?: number;
  color?: string;
};

type ScreenshotSceneProps = {
  src: string;
  label?: string;
  section?: string;
  highlight?: HighlightRect | HighlightRect[];
  scan?: boolean;
  durationInFrames: number;
  imageStyle?: CSSProperties;
};

function TechnicalPaper({ dark = false }: { dark?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        opacity: dark ? 0.2 : 0.34,
        backgroundImage: [
          `radial-gradient(circle at 1px 1px, ${
            dark ? "rgba(255,255,255,0.13)" : "rgba(17,19,21,0.12)"
          } 1px, transparent 1.2px)`,
          `linear-gradient(112deg, transparent 0 46%, ${
            dark ? "rgba(255,255,255,0.025)" : "rgba(85,117,167,0.035)"
          } 46% 46.2%, transparent 46.2% 100%)`,
        ].join(","),
        backgroundSize: "24px 24px, 100% 100%",
      }}
    />
  );
}

function SectionCode({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 30,
        bottom: 24,
        zIndex: 30,
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: dark ? "rgba(255,255,255,0.45)" : "rgba(17,19,21,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function MomentaryCaption({ label, section }: { label?: string; section?: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 3, 14, 20], [0, 1, 1, 0], CLAMP);
  const y = interpolate(frame, [0, 9], [-7, 0], CLAMP);

  if (!label) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        top: 24,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 13px 9px 10px",
        borderRadius: 7,
        background: "rgba(17,19,21,0.9)",
        boxShadow: "0 8px 30px rgba(17,19,21,0.14)",
        color: COLORS.white,
        fontFamily: FONT,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 38,
          height: 22,
          padding: "0 7px",
          borderRadius: 4,
          background: COLORS.red,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
        }}
      >
        {section ?? "MSS"}
      </span>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
        {label}
      </span>
    </div>
  );
}

function ScreenshotCanvas({ src, imageStyle }: { src: string; imageStyle?: CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({
    frame,
    fps,
    config: { damping: 24, stiffness: 130, mass: 0.8 },
    durationInFrames: 18,
  });
  const scale = interpolate(settle, [0, 1], [0.985, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: "10px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
          filter: "drop-shadow(0 12px 28px rgba(17,19,21,0.11))",
          ...imageStyle,
        }}
      />
    </div>
  );
}

function Highlights({ rects, durationInFrames }: { rects: HighlightRect[]; durationInFrames: number }) {
  const frame = useCurrentFrame();

  return (
    <>
      {rects.map((rect, index) => {
        const delay = rect.delay ?? index * 9;
        const opacity = interpolate(
          frame,
          [18 + delay, 26 + delay, durationInFrames - 24, durationInFrames - 14],
          [0, 1, 1, 0],
          CLAMP,
        );
        const pulse = interpolate(
          Math.sin(((frame - delay) / 30) * Math.PI * 2),
          [-1, 1],
          [0.62, 1],
        );
        const color = rect.color ?? COLORS.red;

        return (
          <div
            key={`${rect.left}-${rect.top}-${index}`}
            style={{
              position: "absolute",
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              zIndex: 22,
              boxSizing: "border-box",
              border: `2px solid ${color}`,
              borderRadius: 8,
              background: `${color}09`,
              boxShadow: `0 0 0 3px ${color}12, 0 0 22px ${color}22`,
              opacity: opacity * pulse,
            }}
          />
        );
      })}
    </>
  );
}

function ScanLine({ durationInFrames }: { durationInFrames: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [22, durationInFrames - 24], [0, 1], CLAMP);
  const opacity = interpolate(
    frame,
    [16, 24, durationInFrames - 24, durationInFrames - 14],
    [0, 0.78, 0.78, 0],
    CLAMP,
  );

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 24,
        left: "13%",
        right: "13%",
        top: `${14 + progress * 72}%`,
        height: 2,
        opacity,
        background: `linear-gradient(90deg, transparent, ${COLORS.blue}, ${COLORS.red}, transparent)`,
        boxShadow: `0 0 12px ${COLORS.blue}55`,
      }}
    />
  );
}

function FullScreenshotScene({
  src,
  label,
  section,
  highlight,
  scan = false,
  durationInFrames,
  imageStyle,
}: ScreenshotSceneProps) {
  const rects = !highlight ? [] : Array.isArray(highlight) ? highlight : [highlight];

  return (
    <AbsoluteFill style={{ background: COLORS.paper, overflow: "hidden" }}>
      <ScreenshotCanvas src={src} imageStyle={imageStyle} />
      {rects.length > 0 ? <Highlights rects={rects} durationInFrames={durationInFrames} /> : null}
      {scan ? <ScanLine durationInFrames={durationInFrames} /> : null}
      <MomentaryCaption label={label} section={section} />
    </AbsoluteFill>
  );
}

function OpeningScene() {
  const frame = useCurrentFrame();
  const showTitle = frame < 45;

  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      {showTitle ? (
        <>
          <TechnicalPaper dark />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 92,
              textAlign: "center",
              color: COLORS.red,
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.24em",
            }}
          >
            AI PRODUCTIVITY PLATFORM
          </div>
          <TextReveal
            text="MSS AI 提效平台"
            fontSize={82}
            color={COLORS.white}
            mode="dark"
            theme={DARK_THEME}
            initialScale={1.72}
            holdDuration={7}
            recedeDuration={12}
            assembleDuration={24}
            wordDelay={5}
          />
          <SectionCode dark>01 / PLATFORM</SectionCode>
        </>
      ) : (
        <Sequence from={45}>
          <FullScreenshotScene
            src={screen("home.png")}
            label="MSS AI 提效平台"
            section="01"
            durationInFrames={45}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}

const convergenceScreens = [
  "brief-timeline.png",
  "tool-gemini.png",
  "tool-internal.png",
  "translate-overview.png",
] as const;

function ConvergenceCards() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 115, mass: 0.85 },
    durationInFrames: 36,
  });
  const starts = [
    [-380, -178],
    [380, -178],
    [-380, 178],
    [380, 178],
  ] as const;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.paper,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <TechnicalPaper />
      {convergenceScreens.map((name, index) => {
        const [startX, startY] = starts[index];
        const x = interpolate(progress, [0, 1], [startX, startX * 0.24]);
        const y = interpolate(progress, [0, 1], [startY, startY * 0.32]);
        const scale = interpolate(progress, [0, 1], [0.88, 0.68]);

        return (
          <div
            key={name}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 430,
              height: 246,
              marginLeft: -215,
              marginTop: -123,
              padding: 5,
              borderRadius: 7,
              background: COLORS.white,
              border: `1px solid ${COLORS.line}`,
              boxShadow: "0 16px 36px rgba(17,19,21,0.13)",
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
            }}
          >
            <Img
              src={screen(name)}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 166,
          height: 62,
          marginLeft: -83,
          marginTop: -31,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          borderRadius: 8,
          background: COLORS.ink,
          color: COLORS.white,
          fontFamily: FONT,
          fontSize: 21,
          fontWeight: 800,
          boxShadow: "0 0 0 8px rgba(217,31,53,0.09)",
        }}
      >
        <Img src={staticFile("brand/mss-mark.svg")} style={{ width: 28, height: 28 }} />
        一个入口
      </div>
      <SectionCode>02 / CONVERGENCE</SectionCode>
    </AbsoluteFill>
  );
}

function OneEntranceScene() {
  const frame = useCurrentFrame();

  if (frame < 45) {
    return (
      <AbsoluteFill style={{ background: COLORS.warmWhite }}>
        <TechnicalPaper />
        <TextSwap
          fromText="资讯 · 工具 · 场景 · 实践"
          toText="一个入口"
          transition="fade-through"
          unit="block"
          exitDuration={10}
          enterDuration={13}
          fontSize={68}
          fontWeight={760}
          color={COLORS.ink}
          theme={LIGHT_THEME}
          mode="light"
        />
        <SectionCode>02 / ONE ENTRANCE</SectionCode>
      </AbsoluteFill>
    );
  }

  if (frame < 90) {
    return (
      <Sequence from={45}>
        <ConvergenceCards />
      </Sequence>
    );
  }

  return (
    <Sequence from={90}>
      <FullScreenshotScene
        src={screen("home.png")}
        label="资讯｜工具｜场景｜实践 → 一个入口"
        section="02"
        durationInFrames={60}
      />
    </Sequence>
  );
}

function CapabilityScene() {
  const frame = useCurrentFrame();

  if (frame < 30) {
    return (
      <AbsoluteFill
        style={{
          background: COLORS.ink,
          color: COLORS.white,
          fontFamily: FONT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TechnicalPaper dark />
        <div style={{ fontSize: 78, fontWeight: 820, letterSpacing: "-0.055em" }}>
          AI能力 <span style={{ color: COLORS.red }}>×</span> 办公效率
        </div>
        <SectionCode dark>03 / VALUE</SectionCode>
      </AbsoluteFill>
    );
  }

  return (
    <Sequence from={30}>
      <FullScreenshotScene
        src={screen("home.png")}
        label="AI能力 × 办公效率"
        section="03"
        durationInFrames={90}
        highlight={[
          { left: "13.7%", top: "32.5%", width: "27.8%", height: "61%", delay: 0 },
          { left: "42.1%", top: "32.5%", width: "27.8%", height: "61%", delay: 8 },
          { left: "70.5%", top: "32.5%", width: "27.8%", height: "61%", delay: 16 },
        ]}
      />
    </Sequence>
  );
}

function BriefScene() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <Sequence durationInFrames={60}>
        <FullScreenshotScene
          src={screen("brief-overview.png")}
          label="AI快讯｜每天5分钟，对齐最新前沿"
          section="04"
          durationInFrames={60}
        />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <FullScreenshotScene
          src={screen("brief-timeline.png")}
          durationInFrames={90}
          scan
        />
      </Sequence>
    </AbsoluteFill>
  );
}

function SubscriptionScene() {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [15, 46], [0, 1], CLAMP);
  const notification = spring({
    frame: frame - 34,
    fps: K3_PROMO_FPS,
    config: { damping: 20, stiffness: 125 },
    durationInFrames: 22,
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.warmWhite,
        overflow: "hidden",
        color: COLORS.ink,
        fontFamily: FONT,
      }}
    >
      <TechnicalPaper />
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 72,
          fontSize: 50,
          fontWeight: 800,
          letterSpacing: "-0.045em",
        }}
      >
        一键订阅<span style={{ color: COLORS.red }}>｜</span>自动推送
      </div>
      <div
        style={{
          position: "absolute",
          left: 74,
          right: 365,
          top: 214,
          height: 310,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Img
          src={screen("subscribe-strip.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 13px 28px rgba(17,19,21,0.11))",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 824,
          top: 360,
          width: 220 * line,
          height: 2,
          background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.red})`,
          transformOrigin: "left center",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 70,
          top: 302,
          width: 214,
          height: 116,
          padding: "18px 20px",
          boxSizing: "border-box",
          border: `1px solid ${COLORS.line}`,
          borderRadius: 10,
          background: COLORS.white,
          boxShadow: "0 14px 36px rgba(17,19,21,0.12)",
          opacity: notification,
          transform: `translateY(${interpolate(notification, [0, 1], [14, 0])}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: COLORS.red,
              boxShadow: `0 0 0 5px ${COLORS.red}18`,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 800 }}>自动推送</span>
        </div>
        <div style={{ marginTop: 14, color: COLORS.muted, fontSize: 12, lineHeight: 1.55 }}>
          AI 快讯
        </div>
      </div>
      <SectionCode>05 / SUBSCRIBE</SectionCode>
    </AbsoluteFill>
  );
}

function ExternalCoverageScene() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <Sequence durationInFrames={75}>
        <FullScreenshotScene
          src={screen("home.png")}
          label="最新大小模型｜海内外热门应用"
          section="08"
          durationInFrames={75}
          highlight={{ left: "13.7%", top: "32.5%", width: "27.8%", height: "61%" }}
        />
      </Sequence>
      <Sequence from={75} durationInFrames={75}>
        <FullScreenshotScene
          src={screen("tool-deepseek.png")}
          durationInFrames={75}
          highlight={{ left: "57%", top: "73%", width: "27%", height: "10%" }}
        />
      </Sequence>
    </AbsoluteFill>
  );
}

function ReuseScene() {
  const frame = useCurrentFrame();
  const diagram = spring({
    frame: frame - 75,
    fps: K3_PROMO_FPS,
    config: { damping: 20, stiffness: 118 },
    durationInFrames: 24,
  });
  const showDiagram = frame >= 75;

  return (
    <AbsoluteFill style={{ background: COLORS.warmWhite, overflow: "hidden" }}>
      {showDiagram ? <TechnicalPaper /> : null}
      <div
        style={{
          position: "absolute",
          inset: showDiagram ? "95px 640px 95px 35px" : "10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: showDiagram ? `scale(${interpolate(diagram, [0, 1], [0.96, 1])})` : undefined,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={screen("translate-files.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 12px 28px rgba(17,19,21,0.12))",
          }}
        />
      </div>
      {showDiagram ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 665,
              top: 122,
              width: 500,
              color: COLORS.ink,
              fontFamily: FONT,
              fontSize: 39,
              fontWeight: 810,
              letterSpacing: "-0.045em",
              opacity: diagram,
            }}
          >
            沉淀一份经验
            <br />
            <span style={{ color: COLORS.red }}>服务更多团队</span>
          </div>
          <div
            style={{
              position: "absolute",
              left: 677,
              top: 330,
              width: 408,
              height: 2,
              background: `linear-gradient(90deg, ${COLORS.red}, ${COLORS.blue}, transparent)`,
              transform: `scaleX(${diagram})`,
              transformOrigin: "left center",
            }}
          />
          {["业务团队", "项目团队", "一线同学"].map((team, index) => (
            <div
              key={team}
              style={{
                position: "absolute",
                left: 690 + index * 158,
                top: 378,
                width: 132,
                height: 88,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${COLORS.line}`,
                borderTop: `4px solid ${index === 1 ? COLORS.blue : COLORS.red}`,
                borderRadius: 8,
                background: COLORS.white,
                boxShadow: "0 10px 26px rgba(17,19,21,0.09)",
                color: COLORS.ink,
                fontFamily: FONT,
                fontSize: 16,
                fontWeight: 750,
                opacity: interpolate(diagram, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(diagram, [0, 1], [12 + index * 4, 0])}px)`,
              }}
            >
              {team}
            </div>
          ))}
        </>
      ) : (
        <MomentaryCaption label="沉淀经验｜服务更多团队" section="16" />
      )}
    </AbsoluteFill>
  );
}

function FourValuesScene() {
  const frame = useCurrentFrame();

  if (frame < 30) {
    return (
      <AbsoluteFill
        style={{
          background: COLORS.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TechnicalPaper dark />
        <TextHighlight
          before="找得到｜易学习｜"
          highlight="更新快"
          after="｜好分享"
          preset="color"
          startAt={3}
          drawDuration={10}
          fontSize={58}
          fontWeight={780}
          baseColor={COLORS.white}
          accentColor={COLORS.red}
          highlightedTextColor={COLORS.red}
          theme={DARK_THEME}
          mode="dark"
        />
        <SectionCode dark>17 / FOUR VALUES</SectionCode>
      </AbsoluteFill>
    );
  }

  return (
    <Sequence from={30}>
      <FullScreenshotScene
        src={screen("home.png")}
        label="找得到｜易学习｜更新快｜好分享"
        section="17"
        durationInFrames={90}
        highlight={[
          { left: "31.5%", top: "5.2%", width: "10%", height: "6.8%", delay: 0 },
          { left: "42.5%", top: "5.2%", width: "10%", height: "6.8%", delay: 10 },
          { left: "53.5%", top: "5.2%", width: "10%", height: "6.8%", delay: 20 },
          { left: "64.5%", top: "5.2%", width: "10%", height: "6.8%", delay: 30 },
        ]}
      />
    </Sequence>
  );
}

function OutroScene() {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.warmWhite,
        color: COLORS.ink,
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      <TechnicalPaper />
      <div
        style={{
          position: "absolute",
          left: 122,
          top: 108,
          width: 6,
          height: 432,
          background: COLORS.red,
        }}
      />
      <Img
        src={staticFile("brand/mss-mark.svg")}
        style={{ position: "absolute", left: 178, top: 122, width: 82, height: 82 }}
      />
      <div
        style={{
          position: "absolute",
          left: 178,
          top: 252,
          fontSize: 74,
          fontWeight: 840,
          letterSpacing: "-0.055em",
        }}
      >
        MSS AI 提效平台
      </div>
      <div
        style={{
          position: "absolute",
          left: 182,
          top: 375,
          fontSize: 32,
          fontWeight: 750,
          letterSpacing: "-0.025em",
        }}
      >
        <span style={{ color: COLORS.red }}>火热内测中</span>｜欢迎参与体验
      </div>
      <div
        style={{
          position: "absolute",
          left: 182,
          top: 446,
          color: COLORS.muted,
          fontSize: 20,
          fontWeight: 550,
          letterSpacing: "0.01em",
        }}
      >
        期待您的宝贵建议
      </div>
      <div
        style={{
          position: "absolute",
          right: 98,
          top: 110,
          width: 248,
          height: 248,
          borderRadius: "50%",
          border: `1px solid ${COLORS.line}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 176,
          top: 188,
          width: 92,
          height: 92,
          borderRadius: "50%",
          background: COLORS.red,
          boxShadow: `0 0 0 34px ${COLORS.red}10`,
        }}
      />
      <SectionCode>18 / INTERNAL BETA</SectionCode>
    </AbsoluteFill>
  );
}

function NarratedShot({ index, children }: { index: number; children: ReactNode }) {
  return (
    <AbsoluteFill>
      {children}
      <Audio
        src={staticFile(`audio/voice-k3/shot-${String(index).padStart(2, "0")}.wav`)}
        volume={1}
      />
    </AbsoluteFill>
  );
}

function MusicBed() {
  return (
    <Audio
      src={staticFile("audio/brand-bed-k3.wav")}
      volume={(audioFrame) => {
        const fadeIn = interpolate(audioFrame, [0, 20], [0, 1], CLAMP);
        const fadeOut = interpolate(
          audioFrame,
          [K3_PROMO_DURATION_IN_FRAMES - 36, K3_PROMO_DURATION_IN_FRAMES - 1],
          [1, 0],
          CLAMP,
        );
        return 0.48 * fadeIn * fadeOut;
      }}
    />
  );
}

export function PromoVideoK3() {
  return (
    <AbsoluteFill style={{ background: COLORS.paper }}>
      <MusicBed />
      <Series>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[0]}>
          <NarratedShot index={1}>
            <OpeningScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[1]}>
          <NarratedShot index={2}>
            <OneEntranceScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[2]}>
          <NarratedShot index={3}>
            <CapabilityScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[3]}>
          <NarratedShot index={4}>
            <BriefScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[4]}>
          <NarratedShot index={5}>
            <SubscriptionScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[5]}>
          <NarratedShot index={6}>
            <FullScreenshotScene
              src={screen("home.png")}
              label="业界热门AI应用｜分类优选"
              section="06"
              durationInFrames={K3_SHOT_DURATIONS[5]}
              highlight={{ left: "13.7%", top: "32.5%", width: "27.8%", height: "61%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[6]}>
          <NarratedShot index={7}>
            <FullScreenshotScene
              src={screen("tool-gemini.png")}
              label="图文 / 视频教学"
              section="07"
              durationInFrames={K3_SHOT_DURATIONS[6]}
              highlight={{ left: "57%", top: "72%", width: "27%", height: "11%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[7]}>
          <NarratedShot index={8}>
            <ExternalCoverageScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[8]}>
          <NarratedShot index={9}>
            <FullScreenshotScene
              src={screen("tool-gemini.png")}
              label="推荐易选｜快速上手"
              section="09"
              durationInFrames={K3_SHOT_DURATIONS[8]}
              highlight={{ left: "58%", top: "66%", width: "27%", height: "18%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[9]}>
          <NarratedShot index={10}>
            <FullScreenshotScene
              src={screen("home.png")}
              label="合规办公AI工具｜就在身边"
              section="10"
              durationInFrames={K3_SHOT_DURATIONS[9]}
              highlight={{ left: "42.1%", top: "32.5%", width: "27.8%", height: "61%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[10]}>
          <NarratedShot index={11}>
            <FullScreenshotScene
              src={screen("tool-internal.png")}
              label="真实场景 × 优秀案例"
              section="11"
              durationInFrames={K3_SHOT_DURATIONS[10]}
              highlight={{ left: "57%", top: "65%", width: "27%", height: "19%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[11]}>
          <NarratedShot index={12}>
            <FullScreenshotScene
              src={screen("home.png")}
              label="好用推荐｜快速传播"
              section="12"
              durationInFrames={K3_SHOT_DURATIONS[11]}
              highlight={[
                { left: "43.4%", top: "43%", width: "25%", height: "15%", delay: 0 },
                { left: "43.4%", top: "61%", width: "25%", height: "15%", delay: 12 },
              ]}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[12]}>
          <NarratedShot index={13}>
            <FullScreenshotScene
              src={screen("home.png")}
              label="MSS AI优秀实践和案例"
              section="13"
              durationInFrames={K3_SHOT_DURATIONS[12]}
              highlight={{ left: "70.5%", top: "32.5%", width: "27.8%", height: "61%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[13]}>
          <NarratedShot index={14}>
            <FullScreenshotScene
              src={screen("translate-overview.png")}
              label="聚焦高频、高价值场景"
              section="14"
              durationInFrames={K3_SHOT_DURATIONS[13]}
              highlight={{ left: "57%", top: "37%", width: "27%", height: "27%" }}
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[14]}>
          <NarratedShot index={15}>
            <FullScreenshotScene
              src={screen("translate-quickstart.png")}
              label="一个工具｜解决一类问题"
              section="15"
              durationInFrames={K3_SHOT_DURATIONS[14]}
              scan
            />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[15]}>
          <NarratedShot index={16}>
            <ReuseScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[16]}>
          <NarratedShot index={17}>
            <FourValuesScene />
          </NarratedShot>
        </Series.Sequence>
        <Series.Sequence durationInFrames={K3_SHOT_DURATIONS[17]}>
          <NarratedShot index={18}>
            <OutroScene />
          </NarratedShot>
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
