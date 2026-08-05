import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  resolveOfficeScenesWithCatalog,
  type InternalOfficeScene,
  type InternalOfficeSceneTool,
} from '@/domain/internalOfficeScenes';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import { useInternalOfficeSceneCatalogStore } from '@/stores/internalOfficeSceneCatalogStore';

type PickerMode = 'detail' | 'howto' | 'experience';

export function InternalOfficeSceneGrid({
  search,
  catalogTools,
  onOpenDetail,
  onHowTo,
  onExperience,
}: {
  search: string;
  /** 配置工具主数据：覆盖场景默认链接 / Logo */
  catalogTools: PrototypeToolSeed[];
  onOpenDetail: (tool: InternalOfficeSceneTool) => void;
  onHowTo: (tool: InternalOfficeSceneTool) => void;
  onExperience: (tool: InternalOfficeSceneTool) => void;
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
    if (!scene.tools.length) return;
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

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Start with your task
            </p>
            <h2 className="mt-0.5 text-[16px] font-semibold tracking-tight text-zinc-900 md:text-[17px]">
              今天，你想让 AI 帮你做什么？
            </h2>
          </div>
          <p className="hidden shrink-0 text-[12px] text-zinc-400 sm:block">
            选择一个工作动作，查看核心能力与推荐工具
          </p>
        </div>
        {scenes.length ? (
          <div className="grid min-h-0 flex-1 grid-cols-2 content-stretch gap-3 auto-rows-fr sm:grid-cols-3 lg:grid-cols-4 lg:gap-3.5">
            {scenes.map((scene) => (
              <article
                key={scene.id}
                className="flex min-h-0 flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_36px_-18px_rgba(24,24,27,0.4)] md:p-5"
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
                      {scene.tools.slice(0, 3).map((t) => (
                        <img
                          key={`${scene.id}-${t.id}`}
                          src={t.logoUrl}
                          alt={`${t.name} Logo`}
                          className="h-8 w-8 rounded-full bg-zinc-50 object-cover ring-2 ring-white md:h-9 md:w-9"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-4 flex-1 text-[13px] leading-relaxed text-zinc-500 md:line-clamp-5 md:text-[14px]">
                    {scene.description}
                  </p>
                </button>
                <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => runWithTool(scene, 'howto')}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50"
                  >
                    快速上手
                  </button>
                  <button
                    type="button"
                    onClick={() => runWithTool(scene, 'experience')}
                    className="ml-auto rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
                  >
                    立即体验
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-[13px] text-zinc-400">
            当前搜索下暂无场景
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
