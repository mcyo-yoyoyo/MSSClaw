import { cn } from '@/lib/utils';
import type { PortalMapCard } from '@/domain/portalMap';
import { SCENARIO_JOURNEY_COPY, type ScenarioEnv } from '@/domain/scenarioEnv';
import {
  ARCHITECTURE_DOC_KIND_LABELS,
  type ScenarioArchitectureDoc,
} from '@/domain/scenarioArchitecture';

const VIEW_ONLY_HINT =
  '当前为只读详情。体外请用上方「下载学习」，在线跑任务请用「一键打样」。';

export type ToolkitEnvSlotId = 'hardware' | 'coding' | 'models';

export type ScenarioLayerInspectTarget =
  | { kind: 'capability'; card: PortalMapCard; layerLabel: string }
  | { kind: 'toolkit-tool'; card: PortalMapCard }
  | { kind: 'toolkit-env'; slot: ToolkitEnvSlotId; env: ScenarioEnv | null }
  | { kind: 'architecture'; doc: ScenarioArchitectureDoc };

const SLOT_META: Record<
  ToolkitEnvSlotId,
  { title: string; blurb: string; icon: string }
> = {
  hardware: {
    title: '硬件设备',
    blurb: SCENARIO_JOURNEY_COPY.slotHardware,
    icon: 'fa-laptop',
  },
  coding: {
    title: 'AI Coding 工具',
    blurb: SCENARIO_JOURNEY_COPY.slotCoding,
    icon: 'fa-code',
  },
  models: {
    title: '云端 / 本地大模型',
    blurb: SCENARIO_JOURNEY_COPY.slotModels,
    icon: 'fa-microchip',
  },
};

function ViewOnlyBanner({ text = VIEW_ONLY_HINT }: { text?: string }) {
  return (
    <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
      <i className="fa-solid fa-eye mr-1.5 text-[10px] text-zinc-400" />
      {text}
    </p>
  );
}

function CapabilityInspect({
  card,
  layerLabel,
}: {
  card: PortalMapCard;
  layerLabel: string;
}) {
  return (
    <div className="space-y-3 text-left">
      <ViewOnlyBanner />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <i className={`fa-solid ${card.icon} text-[13px]`} />
        </span>
        <div className="min-w-0">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
            {layerLabel} · {card.kindLabel}
          </span>
          <h3 className="mt-1 text-[15px] font-semibold text-zinc-900">{card.title}</h3>
          {card.meta ? (
            <p className="mt-0.5 font-mono text-[11px] text-claw-700">{card.meta}</p>
          ) : null}
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-zinc-600">{card.desc || '暂无描述'}</p>
      <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 text-[11px] text-zinc-500">
        <p className="font-semibold text-zinc-600">挂载说明</p>
        <p className="mt-1 leading-relaxed">{SCENARIO_JOURNEY_COPY.runInspectHint}</p>
      </div>
    </div>
  );
}

function ToolkitToolInspect({
  card,
  onOpenUrl,
}: {
  card: PortalMapCard;
  onOpenUrl?: (url: string, label: string) => void;
}) {
  const url =
    card.action.type === 'external'
      ? card.action.url
      : card.action.type === 'tool'
        ? card.action.homepageUrl
        : undefined;
  return (
    <div className="space-y-3 text-left">
      <ViewOnlyBanner text="当前为准备清单只读详情。不提供调用；下载学习包见上方按钮。" />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <i className={`fa-solid ${card.icon} text-[13px]`} />
        </span>
        <div className="min-w-0">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
            {SCENARIO_JOURNEY_COPY.inspectToolLabel} · {card.kindLabel}
          </span>
          <h3 className="mt-1 text-[15px] font-semibold text-zinc-900">{card.title}</h3>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-zinc-600">{card.desc || '暂无描述'}</p>
      {url && onOpenUrl ? (
        <button
          type="button"
          onClick={() => onOpenUrl(url, card.title)}
          className="rounded-xl border border-black/8 px-3.5 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
        >
          <i className="fa-solid fa-arrow-up-right-from-square mr-1 text-[10px]" />
          打开了解（外链）
        </button>
      ) : null}
    </div>
  );
}

function ToolkitEnvInspect({
  slot,
  env,
  onOpenUrl,
}: {
  slot: ToolkitEnvSlotId;
  env: ScenarioEnv | null;
  onOpenUrl?: (url: string, label: string) => void;
}) {
  const meta = SLOT_META[slot];
  return (
    <div className="space-y-3 text-left">
      <ViewOnlyBanner text={SCENARIO_JOURNEY_COPY.inspectBanner} />
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
          <i className={`fa-solid ${meta.icon} text-[13px]`} />
        </span>
        <div>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
            {SCENARIO_JOURNEY_COPY.layerBadge}
          </span>
          <h3 className="mt-1 text-[15px] font-semibold text-zinc-900">{meta.title}</h3>
          <p className="text-[11px] text-zinc-400">{meta.blurb}</p>
        </div>
      </div>

      {slot === 'hardware' ? (
        <p className="text-[13px] leading-relaxed text-zinc-700">
          {env?.hardware?.trim() || '本场景暂未配置硬件要求。'}
        </p>
      ) : null}

      {slot === 'coding' ? (
        env?.codingTools?.length ? (
          <ul className="space-y-2">
            {env.codingTools.map((t) => (
              <li
                key={t.name}
                className="rounded-xl border border-zinc-100 px-3 py-2.5 text-[12px] text-zinc-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-zinc-900">{t.name}</span>
                  {t.url && onOpenUrl ? (
                    <button
                      type="button"
                      onClick={() => onOpenUrl(t.url!, t.name)}
                      className="text-[10px] font-medium text-zinc-500 underline-offset-2 hover:underline"
                    >
                      打开官网了解
                    </button>
                  ) : null}
                </div>
                {t.note ? <p className="mt-1 text-[11px] text-zinc-500">{t.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-zinc-400">本场景暂未配置 AI Coding 工具清单。</p>
        )
      ) : null}

      {slot === 'models' ? (
        (() => {
          const models = [...(env?.cloudModels ?? []), ...(env?.localModels ?? [])];
          if (!models.length) {
            return <p className="text-[12px] text-zinc-400">本场景暂未配置大模型清单。</p>;
          }
          return (
            <ul className="space-y-2">
              {models.map((m) => (
                <li
                  key={`${m.kind}-${m.name}`}
                  className="rounded-xl border border-zinc-100 px-3 py-2.5 text-[12px] text-zinc-700"
                >
                  <span
                    className={cn(
                      'mr-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold',
                      m.kind === 'cloud'
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-amber-50 text-amber-800',
                    )}
                  >
                    {m.kind === 'cloud' ? '云端' : '本地'}
                  </span>
                  <span className="font-semibold text-zinc-900">{m.name}</span>
                  {m.note ? <p className="mt-1 text-[11px] text-zinc-500">{m.note}</p> : null}
                </li>
              ))}
            </ul>
          );
        })()
      ) : null}
    </div>
  );
}

function ArchitectureInspect({ doc }: { doc: ScenarioArchitectureDoc }) {
  return (
    <div className="space-y-3 text-left">
      <ViewOnlyBanner text="架构文件为只读 Markdown。需要打包请用上方「下载学习」。" />
      <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
        {ARCHITECTURE_DOC_KIND_LABELS[doc.kind]} · Markdown
      </span>
      <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 font-sans text-[12px] leading-relaxed text-zinc-800">
        {doc.markdown}
      </pre>
    </div>
  );
}

export function ScenarioLayerInspectBody({
  target,
  onOpenUrl,
}: {
  target: ScenarioLayerInspectTarget;
  onOpenUrl?: (url: string, label: string) => void;
}) {
  if (target.kind === 'capability') {
    return <CapabilityInspect card={target.card} layerLabel={target.layerLabel} />;
  }
  if (target.kind === 'toolkit-tool') {
    return <ToolkitToolInspect card={target.card} onOpenUrl={onOpenUrl} />;
  }
  if (target.kind === 'toolkit-env') {
    return (
      <ToolkitEnvInspect slot={target.slot} env={target.env} onOpenUrl={onOpenUrl} />
    );
  }
  return <ArchitectureInspect doc={target.doc} />;
}

export function inspectTitle(target: ScenarioLayerInspectTarget): string {
  if (target.kind === 'architecture') return target.doc.title;
  if (target.kind === 'toolkit-env') return SLOT_META[target.slot].title;
  return target.card.title;
}

export { VIEW_ONLY_HINT };
