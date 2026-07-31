import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import type { ScenarioBundle } from '@/domain/portalMap';
import {
  buildJourneySummary,
  groupItemsByShowcaseTab,
  itemToShowcaseCard,
  SHOWCASE_TABS,
  type ShowcaseTabId,
} from '@/domain/scenarioShowcase';
import { CaseDocumentPreview } from '@/components/content/CaseDocumentPreview';

interface ScenarioShowcasePanelProps {
  scenarioLabel: string;
  items: PortalContentItem[];
  bundle?: Pick<
    ScenarioBundle,
    'layers' | 'agents' | 'skills' | 'tools' | 'env' | 'label'
  >;
  /** 初始 Tab / 条目（从卡片点入时对齐） */
  initialTab?: ShowcaseTabId;
  initialItemId?: string;
  onEditItem?: (id: string) => void;
  className?: string;
}

export function ScenarioShowcasePanel({
  scenarioLabel,
  items,
  bundle,
  initialTab,
  initialItemId,
  onEditItem,
  className,
}: ScenarioShowcasePanelProps) {
  const grouped = useMemo(() => groupItemsByShowcaseTab(items), [items]);

  const availableTabs = useMemo(
    () => SHOWCASE_TABS.filter((t) => grouped[t.id].length > 0),
    [grouped],
  );

  const [tab, setTab] = useState<ShowcaseTabId>(() => {
    if (initialTab && grouped[initialTab]?.length) return initialTab;
    if (initialItemId) {
      const hit = items.find((i) => i.id === initialItemId);
      if (hit) {
        const t = SHOWCASE_TABS.find((x) => grouped[x.id].some((i) => i.id === hit.id));
        if (t) return t.id;
      }
    }
    return availableTabs[0]?.id ?? 'insight';
  });

  const list = grouped[tab] ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!list.length) {
      setIndex(0);
      return;
    }
    if (initialItemId) {
      const i = list.findIndex((x) => x.id === initialItemId);
      setIndex(i >= 0 ? i : 0);
      return;
    }
    setIndex(0);
  }, [tab, list, initialItemId]);

  const current = list[index] ?? null;
  const card = current ? itemToShowcaseCard(current) : null;

  const journey = useMemo(
    () =>
      buildJourneySummary({
        label: bundle?.label ?? scenarioLabel,
        layers: bundle?.layers ?? { thought: items.length > 0, toolkit: false, capability: false },
        agents: bundle?.agents ?? [],
        skills: bundle?.skills ?? [],
        tools: bundle?.tools ?? [],
        env: bundle?.env ?? null,
        items,
      }),
    [bundle, scenarioLabel, items],
  );

  return (
    <div className={cn('space-y-4 text-left', className)}>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-100 pb-2">
        {SHOWCASE_TABS.map((t) => {
          const count = grouped[t.id].length;
          const disabled = count === 0;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold transition',
                tab === t.id
                  ? 'bg-zinc-900 text-white'
                  : disabled
                    ? 'cursor-not-allowed bg-zinc-50 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              )}
            >
              {t.label}
              {count ? (
                <span className="ml-1 tabular-nums opacity-70">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Content carousel */}
      {!current || !card ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center text-[12px] text-zinc-400">
          当前类型暂无上架内容
        </div>
      ) : (
        <div className="space-y-3">
          {list.length > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 disabled:opacity-30"
              >
                <i className="fa-solid fa-chevron-left mr-1 text-[9px]" />
                上一份
              </button>
              <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
                {list.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={cn(
                      'max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] font-medium',
                      i === index
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
                    )}
                    title={item.title}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={index >= list.length - 1}
                onClick={() => setIndex((i) => Math.min(list.length - 1, i + 1))}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 disabled:opacity-30"
              >
                下一份
                <i className="fa-solid fa-chevron-right ml-1 text-[9px]" />
              </button>
            </div>
          ) : null}

          {card.previewFile ? (
            <CaseDocumentPreview file={card.previewFile} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-7 text-center">
              <i className="fa-solid fa-book-open mb-2 text-lg text-zinc-300" />
              <p className="text-[12px] font-medium text-zinc-600">暂无在线预览文档</p>
              <p className="mt-1 text-[11px] text-zinc-400">
                可先读下方简介；运营侧上传 PPT / PDF 后可在此预览
              </p>
              {card.homepageUrl ? (
                <a
                  href={card.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                >
                  打开外链
                </a>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
              {card.typeLabel}
            </span>
            {card.isGold ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                金案例 · 样板间
              </span>
            ) : null}
            {card.publisher ? (
              <span className="text-[11px] text-zinc-400">
                {card.publisher}
                {card.publishedAt ? ` · ${card.publishedAt}` : ''}
              </span>
            ) : null}
            {onEditItem ? (
              <button
                type="button"
                onClick={() => onEditItem(card.id)}
                className="ml-auto text-[11px] font-medium text-zinc-500 underline-offset-2 hover:underline"
              >
                去配置
              </button>
            ) : null}
          </div>

          <h3 className="text-[15px] font-semibold text-zinc-900">{card.title}</h3>
          <p className="text-[13px] leading-relaxed text-zinc-600">{card.desc}</p>

          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-[12px] text-zinc-700">
              {card.applicable}
            </p>
            <p className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-[12px] text-zinc-700">
              {card.audience}
            </p>
          </div>
        </div>
      )}

      {/* 学 / 准备 / 开干概要 */}
      <section className="rounded-xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50/80 to-white p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h4 className="text-[12px] font-semibold text-zinc-800">
            如何学习 · 准备 · 开干
          </h4>
          <span className="text-[10px] text-zinc-400">关闭后可在样板间逐项查看详情</span>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {journey.map((block) => (
            <div
              key={block.id}
              className="rounded-lg border border-zinc-100 bg-white px-2.5 py-2"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded-full bg-zinc-900 px-1.5 py-px text-[9px] font-bold text-white">
                  {block.label}
                </span>
                <span className="truncate text-[11px] font-semibold text-zinc-800">
                  {block.title}
                </span>
              </div>
              <ul className="space-y-1">
                {block.bullets.map((b, i) => (
                  <li key={i} className="text-[11px] leading-snug text-zinc-600">
                    · {b}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] text-zinc-400">{block.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          体外执行请「下载学习」；在线跑模型任务请用「一键打样」。关闭弹窗后，可按需展开样板间①学习 / ②准备 / ③开干详情。
        </p>
      </section>
    </div>
  );
}
