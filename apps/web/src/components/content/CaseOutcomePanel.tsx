import { cn } from '@/lib/utils';
import type { CaseOutcomeCard } from '@/domain/portalCase';
import { isReviewPipelineCase, REVIEW_PIPELINE_STEPS } from '@/domain/reviewPipeline';
import { CaseDocumentPreview } from '@/components/content/CaseDocumentPreview';
import { EngagementActions } from '@/components/content/EngagementActions';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';

interface CaseOutcomePanelProps {
  card: CaseOutcomeCard;
  /** 按此案例打样（技能或专家二选一主转化） */
  onDemoCase?: () => void;
  onDownload?: () => void;
  onEdit?: () => void;
  skillLabel?: string;
  agentLabel?: string;
  className?: string;
  /** 无附件时是否展示「暂未上传」占位，默认 true */
  showDocumentSlot?: boolean;
}

export function CaseOutcomePanel({
  card,
  onDemoCase,
  onDownload,
  onEdit,
  skillLabel,
  agentLabel,
  className,
  showDocumentSlot = true,
}: CaseOutcomePanelProps) {
  return (
    <div className={cn('space-y-4 text-left', className)}>
      {card.previewFile ? (
        <CaseDocumentPreview file={card.previewFile} />
      ) : showDocumentSlot ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center">
          <i className="fa-solid fa-file-arrow-up mb-2 text-lg text-zinc-300" />
          <p className="text-[12px] font-medium text-zinc-600">暂未上传预览文档</p>
          <p className="mt-1 text-[10px] text-zinc-400">
            编辑时可上传 PDF / PPT / Word / Excel，将在此处在线预览
          </p>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="mt-3 rounded-lg border border-black/8 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
            >
              去上传文档
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
          {card.typeLabel}
        </span>
        {card.isGold ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            金案例 · 样板间
          </span>
        ) : null}
        {card.publisher ? (
          <span className="text-[10px] text-zinc-400">
            {card.publisher}
            {card.publishedAt ? ` · ${card.publishedAt}` : ''}
          </span>
        ) : null}
      </div>

      <p className="text-[13px] leading-relaxed text-zinc-600">{card.desc}</p>

      {isReviewPipelineCase(card.id) ? (
        <section className="rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5">
          <h4 className="mb-2 text-[11px] font-semibold text-zinc-500">专家链路 · 采集 → 翻译 → 分析</h4>
          <ol className="grid gap-2 sm:grid-cols-3">
            {REVIEW_PIPELINE_STEPS.map((step, idx) => (
              <li
                key={step.agentId}
                className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2"
              >
                <p className="text-[10px] font-semibold text-zinc-400">
                  {idx + 1}. {step.label}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-800">{step.blurb}</p>
                <p className="mt-1 font-mono text-[10px] text-claw-700">{step.command}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
          <h4 className="text-[11px] font-semibold text-zinc-500">痛点</h4>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-800">{card.painPoint}</p>
        </section>
        <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
          <h4 className="text-[11px] font-semibold text-emerald-700">成效指标</h4>
          <p className="mt-1 text-[12px] font-medium leading-relaxed text-emerald-900">
            {card.impactMetric}
          </p>
        </section>
      </div>

      <section>
        <h4 className="mb-1.5 text-[11px] font-semibold text-zinc-500">打样三步走</h4>
        <ol className="space-y-1.5">
          {card.steps.map((step, idx) => (
            <li
              key={`${idx}-${step.slice(0, 12)}`}
              className="flex gap-2 rounded-lg border border-zinc-100 px-2.5 py-2 text-[12px] text-zinc-700"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-[11px] text-zinc-400">{card.applicable}</p>

      {(card.scenarioTags.length > 0 || card.skillId || card.agentId) && (
        <div className="flex flex-wrap gap-1.5">
          {card.scenarioTags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500"
            >
              #{t}
            </span>
          ))}
          {card.skillId ? (
            <span className="rounded-full bg-claw-600/10 px-2 py-0.5 text-[10px] font-medium text-claw-700">
              Skill · {skillLabel || card.skillId}
            </span>
          ) : null}
          {card.agentId ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              Agent · {agentLabel || card.agentId}
            </span>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        {onDemoCase ? (
          <button
            type="button"
            onClick={onDemoCase}
            className="rounded-xl bg-zinc-900 px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
          >
            按此案例打样
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-black/8 px-3.5 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
          >
            <i className="fa-solid fa-pen mr-1 text-[10px]" />
            编辑
          </button>
        ) : null}
        {onDownload ? (
          <button
            type="button"
            onClick={() => {
              useContentEngagementStore.getState().bumpDownload(card.id);
              onDownload();
            }}
            className="rounded-xl border border-black/8 px-3.5 py-2 text-[12px] font-medium transition hover:bg-black/[0.03]"
          >
            <i className="fa-solid fa-download mr-1 text-[10px]" />
            下载案例包
          </button>
        ) : null}
        <EngagementActions
          contentId={card.id}
          className="ml-auto"
          showDownload={!onDownload}
        />
      </div>
    </div>
  );
}
