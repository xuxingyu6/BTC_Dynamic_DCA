import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, NumberInput, SelectInput, TextInput } from '@/components/ui/Inputs';
import type { BacktestRequest, Frequency, IndicatorThresholds, StrategyConfig } from '@/types';

export interface SimulatorFormValues {
  startDate: string;
  endDate: string;
  frequency: Frequency;
  baseAmount: number;
  level1Amount: number;
  level2Amount: number;
  level3Amount: number;
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
  thresholds,
  loading,
  onSubmit,
}: {
  strategy: StrategyConfig | null;
  thresholds: IndicatorThresholds | null;
  loading: boolean;
  onSubmit: (values: SimulatorFormValues) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const initializedRef = useRef(false);
  const [values, setValues] = useState<SimulatorFormValues>({
    startDate: yearsAgoISO(3),
    endDate: todayISO(),
    frequency: 'weekly',
    baseAmount: 100,
    level1Amount: 500,
    level2Amount: 1000,
    level3Amount: 1500,
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
      frequency: strategy.frequency,
      baseAmount: strategy.baseAmount,
      level1Amount: strategy.level1Amount,
      level2Amount: strategy.level2Amount,
      level3Amount: strategy.level3Amount,
      feeRatePct: strategy.feeRatePct,
      ma200Multiplier: thresholds.ma200Multiplier,
      mvrvThreshold: thresholds.mvrvThreshold,
      puellThreshold: thresholds.puellThreshold,
    }));
  }, [strategy, thresholds]);

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
    setError(null);
    onSubmit(values);
  };

  return (
    <Card className="flex h-fit flex-col p-6 xl:sticky xl:top-20">
      <CardHeader
        title="回测参数"
        subtitle="对比普通 DCA 与动态 DCA"
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

        <Field label="定投频率">
          <SelectInput
            value={values.frequency}
            onChange={(e) => set('frequency', e.target.value as Frequency)}
          >
            <option value="daily">每日</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
          </SelectInput>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="基础定投 (USD)">
            <NumberInput
              min={1}
              value={values.baseAmount}
              onChange={(e) => set('baseAmount', Number(e.target.value) || 0)}
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

        <div className="rounded-xl border border-line bg-inset p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            低估加仓金额 (USD)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['L1', 'level1Amount'],
                ['L2', 'level2Amount'],
                ['L3', 'level3Amount'],
              ] as const
            ).map(([label, key]) => (
              <Field key={key} label={`满足 ${label} 指标`}>
                <NumberInput
                  min={0}
                  value={values[key]}
                  onChange={(e) => set(key, Number(e.target.value) || 0)}
                />
              </Field>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-[11px] font-medium text-muted hover:text-accent"
        >
          {showAdvanced ? '▾ 收起指标阈值' : '▸ 高级：指标阈值'}
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
          运行回测
        </Button>
      </div>
    </Card>
  );
}
