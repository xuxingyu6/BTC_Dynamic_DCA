import { useEffect, useRef, useState } from 'react';
import { Play, Scale } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, NumberInput, TextInput } from '@/components/ui/Inputs';
import type {
  CapitalAllocationConfig,
  IndicatorThresholds,
  StrategyConfig,
} from '@/types';

export interface SimulatorFormValues {
  startDate: string;
  endDate: string;
  /** 每月投入预算（普通 DCA 与动态 DCA 共用） */
  monthlyInvestmentAmount: number;
  feeRatePct: number;
  ma200Multiplier: number;
  mvrvThreshold: number;
  puellThreshold: number;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function yearsAgoISO(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: '近 1 年', years: 1 },
  { label: '近 3 年', years: 3 },
  { label: '近 5 年', years: 5 },
  { label: '完整周期', years: 10 },
];

export function SimulatorForm({
  strategy,
  capital,
  thresholds,
  loading,
  onSubmit,
}: {
  strategy: StrategyConfig | null;
  capital: CapitalAllocationConfig | null;
  thresholds: IndicatorThresholds | null;
  loading: boolean;
  onSubmit: (values: SimulatorFormValues) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const initializedRef = useRef(false);
  const [values, setValues] = useState<SimulatorFormValues>({
    startDate: yearsAgoISO(3),
    endDate: todayISO(),
    // 金额默认值在设置加载后按用户“每月投资预算”动态填入
    monthlyInvestmentAmount: 0,
    feeRatePct: 0.1,
    ma200Multiplier: 1.1,
    mvrvThreshold: 1,
    puellThreshold: 0.6,
  });
  const [error, setError] = useState<string | null>(null);

  // 设置加载后初始化表单（仅一次）
  useEffect(() => {
    if (initializedRef.current || !strategy || !thresholds) return;
    initializedRef.current = true;
    setValues((v) => ({
      ...v,
      monthlyInvestmentAmount: capital?.monthlyInvestmentAmount ?? 1000,
      feeRatePct: strategy.feeRatePct,
      ma200Multiplier: thresholds.ma200Multiplier,
      mvrvThreshold: thresholds.mvrvThreshold,
      puellThreshold: thresholds.puellThreshold,
    }));
  }, [strategy, capital, thresholds]);

  const set = <K extends keyof SimulatorFormValues>(key: K, val: SimulatorFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: val }));

  const submit = () => {
    if (!values.startDate || !values.endDate) {
      setError('请选择回测日期区间');
      return;
    }
    if (values.startDate >= values.endDate) {
      setError('开始日期必须早于结束日期');
      return;
    }
    if (!values.monthlyInvestmentAmount || values.monthlyInvestmentAmount <= 0) {
      setError('请输入有效的每月投资预算');
      return;
    }
    setError(null);
    onSubmit(values);
  };

  return (
    <Card className="flex h-fit flex-col p-6 xl:sticky xl:top-20">
      <CardHeader
        title="回测参数"
        subtitle="普通 DCA 与动态 DCA 基于相同总预算比较"
        right={
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => set('startDate', yearsAgoISO(p.years))}
                className="rounded-md border border-line-strong bg-inset px-2 py-1 text-[10px] text-muted hover:text-accent"
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="开始日期">
            <TextInput
              type="date"
              min="2014-01-01"
              max={todayISO()}
              value={values.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>
          <Field label="结束日期">
            <TextInput
              type="date"
              min="2014-01-01"
              max={todayISO()}
              value={values.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="每月投资预算 (USD)" hint="两种策略共用同一总预算">
            <NumberInput
              min={1}
              step={100}
              value={values.monthlyInvestmentAmount}
              onChange={(e) => set('monthlyInvestmentAmount', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="手续费率 (%)">
            <NumberInput
              min={0}
              max={5}
              step="0.01"
              value={values.feeRatePct}
              onChange={(e) => set('feeRatePct', Number(e.target.value) || 0)}
            />
          </Field>
        </div>

        {/* 资金公平说明 */}
        <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3 text-[11px] leading-relaxed text-muted">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-accent">
            <Scale className="h-3.5 w-3.5" />
            资金公平比较
          </p>
          <p>策略 A（普通 DCA）：每月预算按日平均买入，不看指标。</p>
          <p>策略 B（动态 DCA）：40% 每日底仓 + 60% 加速资金池，指标触发时按当前余额释放（10% / 30% / 60%），未使用资金跨月保留、期末一次性投入。</p>
          <p className="mt-1 text-faint">两策略总投入本金必须一致，否则禁止比较。</p>
        </div>

        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-[11px] font-medium text-muted hover:text-accent"
        >
          {showAdvanced ? '▴ 收起指标阈值' : '▾ 高级：指标阈值'}
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-xl border border-line bg-inset p-3">
            <Field label="MA200W 触发倍数" hint="价格 ≤ 200周均线 × 倍数">
              <NumberInput
                min={1}
                max={2}
                step="0.01"
                value={values.ma200Multiplier}
                onChange={(e) => set('ma200Multiplier', Number(e.target.value) || 1)}
              />
            </Field>
            <Field label="MVRV 触发阈值" hint="MVRV < 阈值">
              <NumberInput
                min={0}
                max={2}
                step="0.01"
                value={values.mvrvThreshold}
                onChange={(e) => set('mvrvThreshold', Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Puell 触发阈值" hint="Puell < 阈值">
              <NumberInput
                min={0}
                max={2}
                step="0.01"
                value={values.puellThreshold}
                onChange={(e) => set('puellThreshold', Number(e.target.value) || 0)}
              />
            </Field>
          </div>
        )}

        {error && <p className="text-xs text-down">{error}</p>}

        <Button variant="primary" size="lg" className="w-full" onClick={submit} loading={loading}>
          <Play className="h-4 w-4" />
          运行公平回测
        </Button>
      </div>
    </Card>
  );
}
