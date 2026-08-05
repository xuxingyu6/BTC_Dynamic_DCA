import { Activity, Coins, Waves } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { fmtNum, fmtPct, fmtUsd } from '@/utils/format';
import type { IndicatorEvaluation, IndicatorZone } from '@/types';

const ICONS: Record<string, React.ReactNode> = {
  ma200w: <Activity className="h-4 w-4" />,
  mvrv: <Coins className="h-4 w-4" />,
  puell: <Waves className="h-4 w-4" />,
};

const ICON_TONES: Record<string, string> = {
  ma200w: 'bg-warn/10 text-warn border-warn/25',
  mvrv: 'bg-accent/10 text-accent border-accent/25',
  puell: 'bg-violet/10 text-violet border-violet/25',
};

function zoneLabel(id: string, zone: IndicatorZone): { label: string; tone: 'green' | 'slate' | 'amber' | 'red' } {
  if (zone === 'unknown') return { label: '数据不足', tone: 'slate' };
  if (id === 'ma200w') {
    return zone === 'undervalued'
      ? { label: '✅ 长期价值区域', tone: 'green' }
      : { label: '正常区域', tone: 'slate' };
  }
  if (id === 'mvrv') {
    return zone === 'extreme-undervalued'
      ? { label: '✅ 极端低估', tone: 'green' }
      : zone === 'undervalued'
        ? { label: '✅ 市场低估', tone: 'green' }
        : { label: '正常区间', tone: 'slate' };
  }
  // puell
  return zone === 'extreme-undervalued'
    ? { label: '✅ 矿工极端压力', tone: 'green' }
    : zone === 'undervalued'
      ? { label: '✅ 矿工压力区域', tone: 'green' }
      : { label: '正常区间', tone: 'slate' };
}

function barFor(ind: IndicatorEvaluation): { pct: number; markerPct: number | null } {
  const threshold = ind.threshold ?? 0;
  if (ind.id === 'ma200w') {
    const ma = ind.value ?? 0;
    const ratio = ma > 0 ? (ind.detail.price as number) / ma : 2;
    return { pct: Math.min(100, Math.max(0, (ratio / 2) * 100)), markerPct: Math.min(100, (threshold / 2) * 100) };
  }
  const value = ind.value ?? 0;
  return { pct: Math.min(100, Math.max(0, (value / 2) * 100)), markerPct: Math.min(100, (threshold / 2) * 100) };
}

export function IndicatorCard({ indicator }: { indicator: IndicatorEvaluation }) {
  const meta = zoneLabel(indicator.id, indicator.zone);
  const bar = barFor(indicator);
  const isMa = indicator.id === 'ma200w';
  const mainValue = isMa ? fmtUsd(indicator.value) : fmtNum(indicator.value, 3);
  const rule = (indicator.detail.rule as string) ?? '';

  return (
    <Card hover triggered={indicator.triggered} className="relative flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', ICON_TONES[indicator.id])}>
            {ICONS[indicator.id]}
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">{indicator.name}</p>
            <p className="text-[11px] text-muted">{indicator.description}</p>
          </div>
        </div>
        <Badge tone={indicator.source === 'manual' ? 'violet' : indicator.source === 'demo' ? 'amber' : indicator.source === 'estimate' ? 'cyan' : 'slate'} className="shrink-0">
          {indicator.source === 'manual'
            ? '手动'
            : indicator.source === 'demo'
              ? '演示'
              : indicator.source === 'estimate'
                ? '估算'
                : '实时'}
        </Badge>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">
            {isMa ? '200W MA' : indicator.id.toUpperCase()}
          </p>
          <p className="mt-0.5 font-mono text-3xl font-bold tnum text-primary">{mainValue}</p>
        </div>
        <Badge tone={meta.tone} className="mb-0.5">
          {meta.label}
        </Badge>
      </div>

      {isMa && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>BTC {fmtUsd(indicator.detail.price as number, 0)}</span>
          <span className={cn((indicator.detail.distancePct as number) <= 10 && 'text-accent')}>
            距离 {fmtPct(indicator.detail.distancePct as number)}
          </span>
        </div>
      )}

      {/* 位置条：标记点 = 触发阈值位置 */}
      <div className="mt-4">
        <div className="relative h-1.5 w-full overflow-visible rounded-full bg-inset">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              indicator.triggered ? 'bg-up/80 shadow-[0_0_10px_var(--glow-up)]' : 'bg-muted/25'
            )}
            style={{ width: `${bar.pct}%` }}
          />
          {bar.markerPct !== null && (
            <span
              className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-primary/40"
              style={{ left: `calc(${bar.markerPct}% - 0.5px)` }}
              title="触发阈值"
            />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-faint">
          <span>{rule}</span>
          <span>{indicator.triggered ? '已触发' : '未触发'}</span>
        </div>
      </div>
    </Card>
  );
}
