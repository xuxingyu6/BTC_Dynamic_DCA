import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, NumberInput, SelectInput } from '@/components/ui/Inputs';
import { Toast } from '@/components/ui/Toast';
import { useSettings } from '@/context/SettingsContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import type { AppSettings } from '@/types';

export function Settings() {
  const { settings, loading, save, reset } = useSettings();
  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !form) setForm(JSON.parse(JSON.stringify(settings)) as AppSettings);
  }, [settings, form]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  if (loading || !form) {
    return (
      <Card className="flex items-center justify-center p-16 text-sm text-muted">加载设置…</Card>
    );
  }

  const setStrategy = (key: keyof AppSettings['strategy'], value: number | string) =>
    setForm((f) => (f ? { ...f, strategy: { ...f.strategy, [key]: value } } : f));

  const setIndicator = (key: keyof AppSettings['indicators'], value: number) =>
    setForm((f) => (f ? { ...f, indicators: { ...f.indicators, [key]: value } } : f));

  const setCapital = (key: keyof AppSettings['capital'], value: number) =>
    setForm((f) => (f ? { ...f, capital: { ...f.capital, [key]: value } } : f));

  const setAcceleration = (key: keyof AppSettings['acceleration'], value: number | null) =>
    setForm((f) => (f ? { ...f, acceleration: { ...f.acceleration, [key]: value } } : f));

  const saveAll = async () => {
    setSaving(true);
    try {
      await save(form);
      showToast('设置已保存并立即生效');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm('恢复全部默认参数？')) return;
    const defaults = await reset();
    setForm(defaults);
    showToast('已恢复默认设置');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* 外观 */}
      <Card className="p-6">
        <CardHeader title="外观" subtitle="浅色 / 深色自由切换，选择会保存在本地" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ThemeSelector />
        </div>
      </Card>

      {/* 定投参数 */}
      <Card className="p-6">
        <CardHeader title="定投参数" subtitle="基础定投金额与各低估等级的加仓金额" />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="基础定投 (USD)">
            <NumberInput min={1} value={form.strategy.baseAmount} onChange={(e) => setStrategy('baseAmount', Number(e.target.value) || 0)} />
          </Field>
          <Field label="满足 1 指标加仓">
            <NumberInput min={0} value={form.strategy.level1Amount} onChange={(e) => setStrategy('level1Amount', Number(e.target.value) || 0)} />
          </Field>
          <Field label="满足 2 指标加仓">
            <NumberInput min={0} value={form.strategy.level2Amount} onChange={(e) => setStrategy('level2Amount', Number(e.target.value) || 0)} />
          </Field>
          <Field label="满足 3 指标加仓">
            <NumberInput min={0} value={form.strategy.level3Amount} onChange={(e) => setStrategy('level3Amount', Number(e.target.value) || 0)} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="定投频率">
            <SelectInput value={form.strategy.frequency} onChange={(e) => setStrategy('frequency', e.target.value)}>
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </SelectInput>
          </Field>
          <Field label="交易手续费率 (%)" hint="回测时从买入金额中扣除">
            <NumberInput min={0} max={5} step="0.01" value={form.strategy.feeRatePct} onChange={(e) => setStrategy('feeRatePct', Number(e.target.value) || 0)} />
          </Field>
        </div>
      </Card>

      {/* 指标阈值 */}
      <Card className="p-6">
        <CardHeader title="指标阈值" subtitle="三指标触发条件（回测与实时评分共用）" />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label="MA200W 触发倍数" hint="价格 ≤ MA200W × 倍数">
            <NumberInput min={1} max={2} step="0.01" value={form.indicators.ma200Multiplier} onChange={(e) => setIndicator('ma200Multiplier', Number(e.target.value) || 1)} />
          </Field>
          <Field label="MVRV 低估阈值" hint="MVRV < 阈值触发">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.mvrvThreshold} onChange={(e) => setIndicator('mvrvThreshold', Number(e.target.value) || 0)} />
          </Field>
          <Field label="MVRV 极端阈值" hint="MVRV < 阈值进入极端区">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.mvrvExtreme} onChange={(e) => setIndicator('mvrvExtreme', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Puell 低估阈值" hint="Puell < 阈值触发">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.puellThreshold} onChange={(e) => setIndicator('puellThreshold', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Puell 极端阈值" hint="Puell < 阈值进入极端区">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.puellExtreme} onChange={(e) => setIndicator('puellExtreme', Number(e.target.value) || 0)} />
          </Field>
        </div>
      </Card>

      {/* 资金分配 */}
      <Card className="p-6">
        <CardHeader
          title="资金分配"
          subtitle="每月预算自动拆分为底仓（Core DCA）与加速资金（Acceleration Reserve）"
        />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="每月投资预算 (USD)">
            <NumberInput
              min={1}
              value={form.capital.monthlyBudget}
              onChange={(e) => setCapital('monthlyBudget', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Core 占比 (%)" hint="底仓每日自动买入">
            <NumberInput
              min={1}
              max={99}
              value={form.capital.corePercentage}
              onChange={(e) => setCapital('corePercentage', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Reserve 占比 (%)" hint="留存为战略加速资金">
            <NumberInput
              min={1}
              max={99}
              value={form.capital.reservePercentage}
              onChange={(e) => setCapital('reservePercentage', Number(e.target.value) || 0)}
            />
          </Field>
          <div className="flex items-end rounded-lg border border-line bg-inset px-3 py-2 text-xs text-muted">
            示例：预算 $1000 → Core ${form.capital.corePercentage * 10}/月 · Reserve ${form.capital.reservePercentage * 10}/月
          </div>
        </div>
      </Card>

      {/* 加速规则 */}
      <Card className="p-6">
        <CardHeader
          title="加速释放规则"
          subtitle="按风险等级分批释放加速资金，并设置月度释放上限"
        />
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Field label="Level 1 释放 (%)" hint="1 个指标触发">
            <NumberInput
              min={0}
              max={100}
              value={form.acceleration.level1Pct}
              onChange={(e) => setAcceleration('level1Pct', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Level 2 释放 (%)" hint="2 个指标触发">
            <NumberInput
              min={0}
              max={100}
              value={form.acceleration.level2Pct}
              onChange={(e) => setAcceleration('level2Pct', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Level 3 释放 (%)" hint="3 个指标触发">
            <NumberInput
              min={0}
              max={100}
              value={form.acceleration.level3Pct}
              onChange={(e) => setAcceleration('level3Pct', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="月度最大释放 (%)" hint="防止连续触发快速耗尽">
            <NumberInput
              min={1}
              max={100}
              value={form.acceleration.monthlyMaxDeploymentPct}
              onChange={(e) => setAcceleration('monthlyMaxDeploymentPct', Number(e.target.value) || 100)}
            />
          </Field>
          <Field label="资金池初始值 (USD)" hint="留空 = 预算 × Reserve 占比">
            <NumberInput
              min={0}
              placeholder="自动"
              value={form.acceleration.initialReserve ?? ''}
              onChange={(e) =>
                setAcceleration(
                  'initialReserve',
                  e.target.value === '' ? null : Number(e.target.value) || 0
                )
              }
            />
          </Field>
        </div>
      </Card>

      {/* 数据源 */}
      <Card className="p-6">
        <CardHeader title="数据源" subtitle="实时数据默认使用 CoinGecko + CoinMetrics（免费），断网时自动降级为演示数据" />
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="数据模式">
            <SelectInput
              value={form.data.providerMode}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, data: { ...f.data, providerMode: e.target.value as 'auto' | 'demo' } } : f))
              }
            >
              <option value="auto">自动（优先实时，失败降级）</option>
              <option value="demo">强制演示数据</option>
            </SelectInput>
          </Field>
          <Field label="刷新间隔 (秒)" hint="Dashboard 自动轮询市场数据">
            <NumberInput min={10} max={3600} step={10} value={form.ui.refreshIntervalSec} onChange={(e) =>
              setForm((f) => (f ? { ...f, ui: { ...f.ui, refreshIntervalSec: Number(e.target.value) || 300 } } : f))
            } />
          </Field>
        </div>

        <div className="mt-5 rounded-xl border border-line bg-inset p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">
            手动覆盖指标（可选，用于模拟情景）
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="MVRV 覆盖值" hint="留空 = 自动使用链上数据">
              <NumberInput
                min={0}
                max={10}
                step="0.01"
                placeholder="自动"
                value={form.data.manualOverride.mvrv ?? ''}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          data: {
                            ...f.data,
                            manualOverride: { ...f.data.manualOverride, mvrv: e.target.value === '' ? null : Number(e.target.value) },
                          },
                        }
                      : f
                  )
                }
              />
            </Field>
            <Field label="Puell 覆盖值" hint="留空 = 自动使用链上数据">
              <NumberInput
                min={0}
                max={10}
                step="0.01"
                placeholder="自动"
                value={form.data.manualOverride.puell ?? ''}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          data: {
                            ...f.data,
                            manualOverride: { ...f.data.manualOverride, puell: e.target.value === '' ? null : Number(e.target.value) },
                          },
                        }
                      : f
                  )
                }
              />
            </Field>
          </div>
          <p className="mt-3 text-[11px] text-faint">
            覆盖仅影响 Dashboard 实时评分，不影响历史回测。
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="green" dot="bg-emerald-400">CoinGecko</Badge>
          <span className="text-[11px] text-faint">价格 / 24h / ATH</span>
          <Badge tone="green" dot="bg-emerald-400">CoinMetrics</Badge>
          <span className="text-[11px] text-faint">历史日线 / MVRV / Puell</span>
        </div>
      </Card>

      {/* 操作 */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-faint">
          动态定投不预测顶部与底部，而是在低估区域提高资金利用效率。投资有风险，本工具仅供参考。
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => void resetAll()}>
            <RotateCcw className="h-4 w-4" />
            恢复默认
          </Button>
          <Button variant="primary" onClick={() => void saveAll()} loading={saving}>
            <Save className="h-4 w-4" />
            保存设置
          </Button>
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  return (
    <Field label="主题模式">
      <SelectInput
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeMode)}
      >
        <option value="light">浅色</option>
        <option value="dark">深色</option>
        <option value="system">跟随系统</option>
      </SelectInput>
    </Field>
  );
}
