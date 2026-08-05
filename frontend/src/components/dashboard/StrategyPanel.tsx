import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { fmtUsd, FREQUENCY_LABEL, OPPORTUNITY_LABELS, STATE_META } from '@/utils/format';
import type { Frequency, StrategyResult } from '@/types';

export function StrategyPanel({
  strategy,
  frequency,
}: {
  strategy: StrategyResult;
  frequency: Frequency;
}) {
  const navigate = useNavigate();
  const state = STATE_META[strategy.marketState] ?? STATE_META.unknown;
  const total = strategy.totalAmount;
  const basePct = total > 0 ? (strategy.baseAmount / total) * 100 : 0;
  const extraPct = total > 0 ? (strategy.extraAmount / total) * 100 : 0;

  return (
    <Card className="flex h-full flex-col p-6">
      <CardHeader
        title="动态定投结果"
        subtitle="基于三个周期指标的实时评分"
        right={
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-2 w-6 rounded-full transition-colors',
                  i < strategy.score
                    ? 'bg-accent shadow-[0_0_8px_var(--glow-soft)]'
                    : 'bg-inset'
                )}
              />
            ))}
          </div>
        }
      />

      <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-inset px-4 py-3">
        <div>
          <p className="text-[11px] text-muted">当前市场评分</p>
          <p className="mt-0.5 font-mono text-xl font-bold tnum text-primary">
            {strategy.score} <span className="text-sm text-muted">/ 3</span>
          </p>
        </div>
        <div className="text-right">
          <Badge tone={strategy.marketState === 'undervalued' ? 'amber' : strategy.marketState === 'extreme-undervalued' ? 'green' : strategy.marketState === 'slight-undervalued' ? 'cyan' : 'slate'}>
            {state.emoji} {strategy.stateLabel}
          </Badge>
          <p className="mt-1 text-[11px] text-muted">市场状态</p>
        </div>
      </div>

      {/* 金额明细 */}
      <div className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">每日底仓</span>
          <span className="font-mono tnum text-secondary">{fmtUsd(strategy.baseAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">
            本次加仓 <span className="text-[10px] text-faint">{OPPORTUNITY_LABELS[strategy.level]}</span>
          </span>
          <span className={cn('font-mono tnum', strategy.extraAmount > 0 ? 'text-up' : 'text-muted')}>
            {strategy.extraAmount > 0 ? `+${fmtUsd(strategy.extraAmount)}` : '+$0'}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <span className="font-medium text-secondary">本次投入</span>
          <span className="text-glow font-mono text-2xl font-bold tnum text-accent">
            {fmtUsd(strategy.totalAmount)}
          </span>
        </div>
      </div>

      {/* 组成条 */}
      <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-inset">
        <div
          className="bg-accent/70 transition-all duration-500"
          style={{ width: `${basePct}%` }}
        />
        {extraPct > 0 && (
          <div
            className="bg-up/70 transition-all duration-500"
            style={{ width: `${extraPct}%` }}
          />
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-faint">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent/70" /> 底仓
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-up/70" /> 加仓
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.07] px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-accent">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          {strategy.advice}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
        <span>频率 {FREQUENCY_LABEL[frequency] ?? frequency}</span>
        <span>下次定投 {strategy.nextBuyDate}</span>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('/simulator')}>
          回测验证策略表现
        </Button>
      </div>
    </Card>
  );
}
