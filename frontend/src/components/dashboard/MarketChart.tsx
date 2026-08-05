import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { ChartTooltip } from '@/components/ui/ChartTooltip';
import { LoadingBlock } from '@/components/ui/Spinner';
import { useHistory } from '@/hooks/useHistory';
import { cn } from '@/utils/cn';
import { fmtCompactUsd } from '@/utils/format';

const RANGES = [
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '5Y', days: 1825 },
  { label: '全部', days: 3650 },
];

function tickDate(v: string): string {
  const [y, m, d] = v.split('-');
  return `${y.slice(2)}/${m}`;
}

export function MarketChart() {
  const [range, setRange] = useState(730);
  const { data, loading } = useHistory(range);

  const points = useMemo(
    () =>
      (data?.points ?? []).map((p) => ({
        ...p,
        ma200w: p.ma200w ?? undefined,
      })),
    [data]
  );

  return (
    <Card className="flex h-full flex-col p-6">
      <CardHeader
        title="BTC 价格与 200 周均线"
        subtitle="长期趋势与当前价格相对位置"
        right={
          <div className="flex items-center gap-1 rounded-lg border border-line-strong bg-inset p-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRange(r.days)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  range === r.days ? 'bg-accent/15 text-accent' : 'text-muted hover:text-primary'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-4 flex-1">
        {loading && !data ? (
          <LoadingBlock label="加载历史数据…" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(100,116,139,0.14)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={tickDate}
                minTickGap={56}
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
              <Area
                type="monotone"
                dataKey="price"
                name="BTC 价格"
                stroke="#0ea5e9"
                strokeWidth={1.8}
                fill="url(#priceArea)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ma200w"
                name="200W MA"
                stroke="#f59e0b"
                strokeWidth={1.3}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
