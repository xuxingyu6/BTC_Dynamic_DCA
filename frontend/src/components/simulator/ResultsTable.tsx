import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { fmtNum, fmtPct, fmtQty, fmtUsd } from '@/utils/format';
import type { BacktestResponse } from '@/types';

interface Row {
  label: string;
  hint?: string;
  a: string;
  b: string;
  delta: string | null;
  better: 'b' | 'a' | 'none';
  highlight?: boolean;
}

export function ResultsTable({ result }: { result: BacktestResponse }) {
  const { a, b, delta } = result.summary;

  const rows: Row[] = [
    { label: '总投入资金', a: fmtUsd(a.totalInvested), b: fmtUsd(b.totalInvested), delta: `+${fmtUsd(delta.extraInvested)}`, better: 'none' },
    { label: 'BTC 累计数量', a: fmtQty(a.btcAccumulated), b: fmtQty(b.btcAccumulated), delta: `+${fmtQty(delta.extraBtc)}`, better: 'b', highlight: true },
    { label: '平均成本', a: fmtUsd(a.avgCost), b: fmtUsd(b.avgCost), delta: `${fmtUsd(delta.avgCostDeltaPct)}`, better: 'b' },
    { label: '当前价值', a: fmtUsd(a.currentValue), b: fmtUsd(b.currentValue), delta: `+${fmtUsd(b.currentValue - a.currentValue)}`, better: 'b', highlight: true },
    { label: '收益率', a: fmtPct(a.returnPct), b: fmtPct(b.returnPct), delta: fmtPct(delta.returnDeltaPct), better: 'b', highlight: true },
    { label: '年化收益率 CAGR', a: a.cagrPct === null ? '--' : fmtPct(a.cagrPct), b: b.cagrPct === null ? '--' : fmtPct(b.cagrPct), delta: a.cagrPct === null || b.cagrPct === null ? null : fmtPct(b.cagrPct - a.cagrPct), better: 'b' },
    { label: '最大回撤', a: `-${fmtNum(a.maxDrawdownPct)}%`, b: `-${fmtNum(b.maxDrawdownPct)}%`, delta: null, better: b.maxDrawdownPct < a.maxDrawdownPct ? 'b' : 'a' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-muted">
            <th className="pb-2.5 pr-4 font-medium">指标</th>
            <th className="pb-2.5 pr-4 font-medium text-secondary">策略 A · 普通 DCA</th>
            <th className="pb-2.5 pr-4 font-medium text-accent">策略 B · 动态 DCA</th>
            <th className="pb-2.5 font-medium">差异</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line last:border-0">
              <td className="py-3 pr-4">
                <span className={cn('text-secondary', row.highlight && 'font-medium text-primary')}>
                  {row.label}
                </span>
                {row.hint && <span className="ml-1.5 text-[10px] text-faint">{row.hint}</span>}
              </td>
              <td className="py-3 pr-4 font-mono tnum text-secondary">{row.a}</td>
              <td className="py-3 pr-4">
                <span className="font-mono tnum text-primary">{row.b}</span>
                {row.better === 'b' && <Badge tone="green" className="ml-2">更优</Badge>}
              </td>
              <td
                className={cn(
                  'py-3 font-mono tnum',
                  row.delta === null
                    ? 'text-muted'
                    : row.better === 'b'
                      ? 'text-up'
                      : row.better === 'a'
                        ? 'text-down'
                        : 'text-muted'
                )}
              >
                {row.delta ?? '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
