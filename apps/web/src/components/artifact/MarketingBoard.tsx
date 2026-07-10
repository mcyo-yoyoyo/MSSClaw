import { lazy, Suspense } from 'react';

const MarketingBoardChart = lazy(() => import('@/components/artifact/MarketingBoardChart'));

export function MarketingBoard() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <i className="fa-solid fa-chart-line" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">3C 智能终端 - Q3 业务异动诊断报告</h3>
            <p className="text-[10px] text-[#aeaeb2]">数据源: SAP ERP(EU) + Salesforce | 模型: SHAP 归因树</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold text-green-600">
          <i className="fa-solid fa-shield-check" /> 数据审计通过
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          ['旗舰智能手机 销量', '142,500 台', '-12.4% MoM', 'text-red-500'],
          ['均单客单价 (AOV)', '€899.00', '0.0% MoM', 'text-[#aeaeb2]'],
          ['渠道库存周转天数', '48.5 天', '预警超标', 'text-amber-500'],
          ['拉新成本 (CAC)', '€45.2', '优化 5.2%', 'text-green-500'],
        ].map(([title, value, delta, color]) => (
          <div key={title} className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase text-[#86868b]">{title}</p>
            <p className="mt-1 text-xl font-bold text-[#1d1d1f]">{value}</p>
            <div className={`mt-2 text-[11px] font-bold ${color}`}>{delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 flex h-[260px] flex-col rounded-xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <h5 className="mb-4 flex items-center gap-2 text-[11px] font-bold text-[#424245]">
            <i className="fa-solid fa-chart-area text-zinc-600" /> SHAP Value 销量异动归因分析
          </h5>
          <div className="relative h-full w-full flex-grow">
            <Suspense
              fallback={<div className="h-full w-full animate-pulse rounded-lg bg-black/[0.04]" />}
            >
              <MarketingBoardChart />
            </Suspense>
          </div>
        </div>

        <div className="col-span-2 flex h-[260px] flex-col rounded-xl bg-slate-900 p-5 text-white shadow-lg">
          <h5 className="mb-4 flex justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Root Cause 自动诊断</span>
            <i className="fa-solid fa-stethoscope" />
          </h5>
          <div className="scroll-hidden flex-grow space-y-3 overflow-y-auto pr-1">
            <div className="rounded-lg border border-white/5 border-l-4 border-l-red-500 bg-white/10 p-3">
              <p className="mb-1 text-[11px] font-bold text-red-300">主因 1：竞品激进定价策略 (贡献度 65%)</p>
              <p className="text-[10px] leading-relaxed text-slate-300">
                竞品 Fruit 品牌在 8 月初下调入门级机型价格 15%，抢占了德法区 22% 中端换机份额。
              </p>
            </div>
            <div className="rounded-lg border border-white/5 border-l-4 border-l-amber-500 bg-white/10 p-3">
              <p className="mb-1 text-[11px] font-bold text-amber-300">主因 2：渠道营销物料错配 (贡献度 20%)</p>
              <p className="text-[10px] leading-relaxed text-slate-300">
                线下门店主推物料仍为上一代降噪耳机，未能形成连带销售。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
