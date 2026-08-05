import { useState } from 'react';
import { BacktestCharts } from '@/components/simulator/BacktestCharts';
import { ResultsTable } from '@/components/simulator/ResultsTable';
import { SimulatorForm, type SimulatorFormValues } from '@/components/simulator/SimulatorForm';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Spinner';
import { useSettings } from '@/context/SettingsContext';
import { api } from '@/services/api';
import { fmtNum, fmtPct, fmtQty, fmtUsd } from '@/utils/format';
import type { BacktestResponse } from '@/types';
import { LineChart } from 'lucide-react';

export function Simulator() {
  const { settings } = useSettings();
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (values: SimulatorFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest({
        startDate: values.startDate,
        endDate: values.endDate,
        frequency: values.frequency,
        baseAmount: values.baseAmount,
        level1Amount: values.level1Amount,
        level2Amount: values.level2Amount,
        level3Amount: values.level3Amount,
        ma200Multiplier: values.ma200Multiplier,
        mvrvThreshold: values.mvrvThreshold,
        puellThreshold: values.puellThreshold,
        feeRatePct: values.feeRatePct,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '回测失败');
    } finally {
      setLoading(false);
    }
  };

  const delta = result?.summary.delta;

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-3">
        <SimulatorForm
          strategy={settings?.strategy ?? null}
          thresholds={settings?.indicators ?? null}
          loading={loading}
          onSubmit={(v) => void run(v)}
        />

        <div className="space-y-5 xl:col-span-2">
          {error && (
            <Card className="p-4 text-sm text-down">{error}</Card>
          )}

          {!result && !error && (
            <Card className="flex h-full min-h-[380px] items-center justify-center p-8">
              <EmptyState
                icon={<LineChart className="h-10 w-10" />}
                title="设置参数并运行回测"
                subtitle="系统将使用历史 BTC 数据模拟两种策略：普通 DCA 固定投入，动态 DCA 依据 200W MA、MVRV、Puell 指标自动加仓。"
              />
            </Card>
          )}

          {result && (
            <>
              {/* 核心差异卡片 */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted">动态 DCA 多积累 BTC</p>
                  <p className="mt-1 font-mono text-xl font-bold tnum text-up">
                    +{fmtQty(delta?.extraBtc)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">额外持仓</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted">收益率提升</p>
                  <p className="mt-1 font-mono text-xl font-bold tnum text-accent">
                    {fmtPct(delta?.returnDeltaPct)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">相对普通 DCA</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted">平均成本优化</p>
                  <p className="mt-1 font-mono text-xl font-bold tnum text-up">
                    {fmtUsd(delta?.avgCostDeltaPct)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">每 BTC 节省</p>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted">多投入资金</p>
                  <p className="mt-1 font-mono text-xl font-bold tnum text-secondary">
                    {fmtUsd(delta?.extraInvested)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">
                    {result.buyCount} 次定投 · {result.days} 天
                  </p>
                </Card>
              </div>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-primary">策略对比</h3>
                  <Badge tone="slate">{result.dataSource}</Badge>
                </div>
                <ResultsTable result={result} />
              </Card>
            </>
          )}
        </div>
      </div>

      {result && <BacktestCharts result={result} />}

      <p className="px-1 text-[11px] leading-relaxed text-faint">
        回测说明：动态策略依据当日已知指标（无未来函数）在低估区间加仓；回测结果基于历史数据，不代表未来收益，仅供策略研究参考。
      </p>
    </div>
  );
}
