import type { KbArtifact } from '@/domain/kbSearch';

interface KnowledgeCardProps {
  artifact?: KbArtifact | null;
  onCitationClick?: (docId: string, citationIndex: number, snippet: string) => void;
}

export function KnowledgeCard({ artifact, onCitationClick }: KnowledgeCardProps) {
  const citations = artifact?.citations ?? [];
  const bullets = artifact?.bullets ?? [];
  const query = artifact?.query;

  const fallbackBullets = [
    {
      text: '拉美合规准入：新款降噪耳机在拉美的核心阻碍是缺乏巴西 ANATEL 最新的电池热稳定认证',
      citationIndex: 1,
    },
    {
      text: '手表 OKR 延期风险：可穿戴部门的 KR2 进度滞后，当前良率未达标',
      citationIndex: 2,
    },
    {
      text: '客诉处理 SOP：面对「设备过热」，一线需引导用户关闭高性能模式，并下发 OTA 固件 1.4.2',
      citationIndex: 3,
    },
  ];

  const displayBullets = bullets.length ? bullets : fallbackBullets;

  const resolveCitation = (index: number) => {
    if (!index) return null;
    return citations.find((c) => c.index === index) ?? citations[index - 1] ?? null;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pt-4">
      <div className="flex items-center gap-6 rounded-xl border border-black/[0.06] bg-white p-3 text-[11px] shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-bold text-[#86868b]">Milvus Vector DB 连通</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-[#6e6e73]">
          <i className="fa-solid fa-bolt text-amber-500" /> RAG 重排耗时: <b>385ms</b>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-[#6e6e73]">
          <i className="fa-solid fa-file-shield text-[#aeaeb2]" /> 引用参考源:{' '}
          <b>{citations.length || 3} 份密级文档</b>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-md">
        <div className="border-b border-emerald-100 bg-emerald-50/50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
            <i className="fa-solid fa-brain text-emerald-500" /> AI 聚合摘要
          </h2>
          {query && (
            <p className="mt-1 text-[11px] text-emerald-800/70">
              检索词：<span className="font-medium">{query}</span>
            </p>
          )}
        </div>
        <div className="space-y-4 p-6">
          <div className="text-[13px] leading-relaxed text-[#424245]">
            <p className="mb-3">
              {citations.length
                ? '基于企业知识库检索结果，核心结论如下（点击引用编号查看溯源）：'
                : '基于企业知识库最新同步的数据（截止昨日），关于您的查询核心结论如下：'}
            </p>
            <ul className="list-inside list-disc space-y-2 marker:text-emerald-500">
              {displayBullets.map((bullet, i) => {
                const citation = resolveCitation(bullet.citationIndex);
                const label = citation?.docTitle ?? `参考源 ${bullet.citationIndex}`;
                return (
                  <li key={i}>
                    {bullet.text}
                    {bullet.citationIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (citation && onCitationClick) {
                            onCitationClick(citation.docId, citation.index, citation.snippet);
                          }
                        }}
                        className="citation-badge ml-1 cursor-pointer border-0 bg-transparent p-0"
                        title={`源：${label}`}
                      >
                        {bullet.citationIndex}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {citations.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                引用溯源
              </p>
              <div className="space-y-2">
                {citations.map((c) => (
                  <button
                    key={`${c.docId}-${c.index}`}
                    type="button"
                    onClick={() => onCitationClick?.(c.docId, c.index, c.snippet)}
                    className="flex w-full items-start gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
                  >
                    <span className="citation-badge shrink-0">{c.index}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-[#1d1d1f]">{c.docTitle}</span>
                      <span className="line-clamp-2 text-[11px] text-[#86868b]">{c.snippet}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
