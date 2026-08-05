import { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartTooltip } from '@/components/ui/ChartTooltip';
import { fmtCompactUsd, fmtUsd } from '@/utils/format';
import type { BacktestResponse } from '@/types';

const LEVEL_COLORS: Record<number, string> = {
  0: '#64748b',
  1: '#0891b2',
  2: '#d97706',
  3: '#059669',
};

function tickDate(v: string): string {
  const [y, m] = v.split('-');
  return `${y.slice(2)}/${m}`;
}

export function BacktestCharts({ result }: { result: BacktestResponse }) {
  const points = useMemo(
    () => result.points.map((p) => ({ ...p, ma200w: p.ma200w ?? undefined })),
    [result]
  );
  const buyA = useMemo(
    () => result.buyPoints.filter((p) => p.strategy === 'A'),
    [result]
  );
  const buyB = useMemo(
    () => result.buyPoints.filter((p) => p.strategy === 'B' && p.level >= 1),
    [result]
  );

  return (
    <div className="space-y-5">
      {/* 图表 1：价格 + 买入点 */}
      <div className="rounded-2xl border border-line bg-panel/80 p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-primary">BTC 价格与定投买入点</h3>
            <p className="text-xs text-muted">灰色为普通定投，彩色为动态加仓（按触发等级着色）</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-[#0ea5e9]" /> 价格</span>
            <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t border-dashed border-[#f59e0b]" /> 200W MA</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> 普通定投</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#d97706]" /> L2 加仓</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#059669]" /> L3 加仓</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(100,116,139,0.14)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={tickDate}
              minTickGap={64}
              axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v: number) => fmtCompactUsd(v)}
              width={58}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip formatter={(v: number) => fmtCompactUsd(v)} />}
              cursor={{ stroke: 'rgba(148,163,184,0.25)', strokeDasharray: '3 3' }}
            />
            <Line
              data={points}
              type="monotone"
              dataKey="price"
              name="BTC 价格"
              stroke="#0ea5e9"
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              data={points}
              type="monotone"
              dataKey="ma200w"
              name="200W MA"
              stroke="#f59e0b"
              strokeWidth={1.1}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Scatter data={buyA} name="普通定投" fill="#64748b" fillOpacity={0.65} shape="circle" isAnimationActive={false}>
              {buyA.map((p) => (
                <Cell key={`a-${p.date}`} fill="#64748b" />
              ))}
            </Scatter>
            <Scatter data={buyB} name="动态加仓" shape="circle" isAnimationActive={false}>
              {buyB.map((p) => (
                <Cell key={`b-${p.date}-${p.level}`} fill={LEVEL_COLORS[p.level] ?? '#0891b2'} />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 图表 2：账户净值对比 */}
      <div className="rounded-2xl border border-line bg-panel/80 p-5 backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-primary">账户净值对比</h3>
            <p className="text-xs text-muted">含投入成本与持仓市值的走势对比</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-[#0ea5e9]" /> 动态 DCA</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-4 rounded bg-slate-500" /> 普通 DCA</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(100,116,139,0.14)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={tickDate}
              minTickGap={64}
              axisLine={{ stroke: 'rgba(148,163,184,0.15)' }}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v: number) => fmtCompactUsd(v)}
              width={58}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip formatter={(v: number) => fmtUsd(v, 0)} />}
              cursor={{ stroke: 'rgba(148,163,184,0.25)', strokeDasharray: '3 3' }}
            />
            <Line type="monotone" dataKey="portfolioB" name="动态 DCA 净值" stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="portfolioA" name="普通 DCA 净值" stroke="#64748b" strokeWidth={1.4} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="investedB" name="动态累计投入" stroke="#10b981" strokeWidth={1} strokeOpacity={0.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="investedA" name="普通累计投入" stroke="#64748b" strokeWidth={1} strokeOpacity={0.4} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
