import { Bitcoin } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import {
  fmtCompactUsd,
  fmtPct,
  fmtUsd,
  STATE_META,
} from '@/utils/format';
import type { HistoryResponse, MarketSnapshot, StrategyResult } from '@/types';

export function PriceHero({
  market,
  strategy,
  history,
}: {
  market: MarketSnapshot;
  strategy: StrategyResult;
  history: HistoryResponse | null;
}) {
  const up = market.change24hPct >= 0;
  const state = STATE_META[strategy.marketState] ?? STATE_META.unknown;
  const spark = (history?.points ?? []).slice(-90);

  return (
    <Card className="relative overflow-hidden p-6">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-violet/10 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-3">
        {/* 左：价格与统计 */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
              <Bitcoin className="h-6 w-6 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">BTC</span>
                <span className="text-xs text-muted">Bitcoin · 比特币</span>
                <Badge tone={up ? 'green' : 'red'}>
                  {up ? '▲' : '▼'} {fmtPct(market.change24hPct)} 24h
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                {market.source === 'coingecko'
                  ? 'CoinGecko 实时行情'
                  : market.source === 'coinmetrics'
                    ? 'CoinMetrics 实时行情'
                    : '演示数据'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
            <span className="text-glow font-mono text-4xl font-bold tnum text-primary md:text-5xl">
              {fmtUsd(market.price)}
            </span>
            <span className="mb-1.5 flex items-center gap-2">
              <Badge tone={state.color === 'text-up' ? 'green' : state.color === 'text-warn' ? 'amber' : state.color === 'text-accent' ? 'cyan' : 'slate'}>
                {state.emoji} {state.label}
              </Badge>
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="历史最高 ATH" value={fmtCompactUsd(market.ath)} sub={market.athDate ?? '--'} />
            <Stat
              label="距 ATH"
              value={fmtPct(market.athDistancePct)}
              accent
              sub="当前价格相对峰值"
            />
            <Stat label="流通市值" value={fmtCompactUsd(market.marketCap)} sub="Market Cap" />
            <Stat label="市场周期" value={state.label} sub={`评分 ${strategy.score} / 3`} />
          </div>
        </div>

        {/* 右：90 日迷你走势 */}
        <div className="hidden lg:block">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            近 90 日走势
          </p>
          <div className="h-[140px] w-full rounded-xl border border-line bg-inset p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['auto', 'auto']} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#0ea5e9"
                  strokeWidth={1.8}
                  fill="url(#sparkFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
