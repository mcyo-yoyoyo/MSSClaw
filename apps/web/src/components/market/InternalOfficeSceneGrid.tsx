import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  resolveOfficeScenesWithCatalog,
  resolveOfficeToolWithCatalog,
  type InternalOfficeScene,
  type InternalOfficeSceneTool,
} from '@/domain/internalOfficeScenes';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';

type PickerMode = 'detail' | 'howto' | 'experience';

const ASSISTANT_TOOL_ID = 'tool-hw-assistant';

export function InternalOfficeSceneGrid({
  search,
  catalogTools,
  onOpenDetail,
  onHowTo,
  onExperience,
  onEmptyAction,
}: {
  search: string;
  /** 配置工具主数据：覆盖场景默认链接 / Logo */
  catalogTools: PrototypeToolSeed[];
  onOpenDetail: (tool: InternalOfficeSceneTool) => void;
  onHowTo: (tool: InternalOfficeSceneTool) => void;
  onExperience: (tool: InternalOfficeSceneTool) => void;
  /** 场景无可用工具时点击反馈（toast） */
  onEmptyAction?: (scene: InternalOfficeScene, mode: PickerMode) => void;
}) {
  const [picker, setPicker] = useState<{
    scene: InternalOfficeScene;
    mode: PickerMode;
  } | null>(null);
  const sceneEntries = useInternalOfficeSceneCatalogStore((s) => s.entries);

  const allScenes = useMemo(
    () => resolveOfficeScenesWithCatalog(catalogTools, sceneEntries),
    [catalogTools, sceneEntries],
  );

  const assistantTool = useMemo(() => {
    const fromScene = allScenes
      .flatMap((s) => s.tools)
      .find((t) => t.id === ASSISTANT_TOOL_ID);
    if (fromScene) return fromScene;
    const seed = catalogTools.find((t) => t.id === ASSISTANT_TOOL_ID) ?? null;
    return resolveOfficeToolWithCatalog(
      {
        id: ASSISTANT_TOOL_ID,
        name: '员工助手',
        blurb: '综合知识问答',
        homepageUrl: '#',
        logoUrl: '',
      },
      seed,
    );
  }, [allScenes, catalogTools]);

  const scenes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allScenes;
    return allScenes.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.english.toLowerCase().includes(q) ||
        s.tools.some(
          (t) =>
            t.name.toLowerCase().includes(q) || t.blurb.toLowerCase().includes(q),
        ),
    );
  }, [allScenes, search]);

  const runWithTool = (scene: InternalOfficeScene, mode: PickerMode) => {
    if (!scene.tools.length) {
      onEmptyAction?.(scene, mode);
      return;
    }
    if (scene.tools.length === 1) {
      const tool = scene.tools[0]!;
      if (mode === 'experience') onExperience(tool);
      else if (mode === 'howto') onHowTo(tool);
      else onOpenDetail(tool);
      return;
    }
    setPicker({ scene, mode });
  };

  const pickTool = (tool: InternalOfficeSceneTool) => {
    if (!picker) return;
    const { mode } = picker;
    setPicker(null);
    if (mode === 'experience') onExperience(tool);
    else if (mode === 'howto') onHowTo(tool);
    else onOpenDetail(tool);
  };

  const emptyCopy = search.trim()
    ? '当前搜索下暂无场景'
    : '暂无可用办公场景，请联系运营配置工具绑定';

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          className="internal-assistant-chat shrink-0"
          onClick={() => onExperience(assistantTool)}
          aria-label="员工助手待上线，点击前往员工助手下载页"
          title="点击前往员工助手下载页"
        >
          <div className="internal-assistant-chat__head">
            {assistantTool.logoUrl ? (
              <img
                src={assistantTool.logoUrl}
                alt=""
                className="internal-assistant-chat__logo"
                loading="lazy"
              />
            ) : (
              <span className="internal-assistant-chat__logo inline-flex items-center justify-center">
                <i className="fa-solid fa-robot text-[14px] text-[#a1a1aa]" />
              </span>
            )}
            <div className="internal-assistant-chat__copy">
              <p className="internal-assistant-chat__name">{assistantTool.name || '员工助手'}</p>
              <p className="internal-assistant-chat__headline">今天，你想让 AI 帮你做什么？</p>
            </div>
            <span className="internal-assistant-chat__badge">待上线</span>
          </div>
          <div className="internal-assistant-chat__composer" aria-hidden>
            <span className="min-w-0 flex-1 truncate">给员工助手发送消息…</span>
            <span className="internal-assistant-chat__send">
              <i className="fa-solid fa-arrow-up text-[11px]" />
            </span>
          </div>
          <p className="internal-assistant-chat__hint">点击前往员工助手下载页</p>
        </button>

        {scenes.length ? (
          <div className="grid min-h-0 flex-1 grid-cols-2 content-stretch gap-3 auto-rows-fr sm:grid-cols-3 lg:grid-cols-4 lg:gap-3.5">
            {scenes.map((scene) => {
              const hasTools = scene.tools.length > 0;
              return (
                <article
                  key={scene.id}
                  className={cn(
                    'flex min-h-0 flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 transition md:p-5',
                    hasTools
                      ? 'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_36px_-18px_rgba(24,24,27,0.4)]'
                      : 'opacity-80',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => runWithTool(scene, 'detail')}
                    className="flex min-h-0 flex-1 flex-col text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900 md:text-[18px]">
                          {scene.label}
                        </h3>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                          {scene.english}
                        </p>
                      </div>
                      <div className="flex shrink-0 -space-x-2">
                        {hasTools ? (
                          scene.tools.slice(0, 3).map((t) => (
                            <img
                              key={`${scene.id}-${t.id}`}
                              src={t.logoUrl}
                              alt={`${t.name} Logo`}
                              className="h-8 w-8 rounded-full bg-zinc-50 object-cover ring-2 ring-white md:h-9 md:w-9"
                              loading="lazy"
                            />
                          ))
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-400">
                            待配置
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-4 flex-1 text-[13px] leading-relaxed text-zinc-500 md:line-clamp-5 md:text-[14px]">
                      {scene.description}
                    </p>
                    {!hasTools ? (
                      <p className="mt-2 text-[11px] text-amber-700/80">
                        暂无已发布工具，请运营绑定后体验
                      </p>
                    ) : null}
                  </button>
                  <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
                    <button
                      type="button"
                      disabled={!hasTools}
                      onClick={() => runWithTool(scene, 'howto')}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition',
                        hasTools
                          ? 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                          : 'cursor-not-allowed border-zinc-100 text-zinc-300',
                      )}
                    >
                      快速上手
                    </button>
                    <button
                      type="button"
                      disabled={!hasTools}
                      onClick={() => runWithTool(scene, 'experience')}
                      className={cn(
                        'ml-auto rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                        hasTools
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                          : 'cursor-not-allowed bg-zinc-200 text-zinc-400',
                      )}
                    >
                      立即体验
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[13px] text-zinc-400">
            {emptyCopy}
          </div>
        )}
      </section>

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="关闭工具选择"
            onClick={() => setPicker(null)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-semibold text-zinc-900">{picker.scene.label}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
                  {picker.mode === 'experience'
                    ? '这项工作可由多个内部产品完成，请选择要打开的工具。'
                    : picker.mode === 'howto'
                      ? '这项工作可由多个内部产品完成，请选择要查看快速上手的工具。'
                      : '这项工作可由多个内部产品完成，请选择要查看详情的工具。'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="rounded-lg px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-50"
              >
                关闭
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {picker.scene.tools.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pickTool(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200/90 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <img
                      src={t.logoUrl}
                      alt={`${t.name} Logo`}
                      className="h-8 w-8 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">{t.name}</p>
                      <p className="truncate text-[11px] text-zinc-500">{t.blurb}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold',
                        picker.mode === 'experience'
                          ? 'bg-zinc-900 text-white'
                          : 'border border-zinc-200 text-zinc-600',
                      )}
                    >
                      {picker.mode === 'experience'
                        ? '立即体验'
                        : picker.mode === 'howto'
                          ? '快速上手'
                          : '查看详情'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
