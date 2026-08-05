import { useEffect, useState } from 'react';
import { Lock, RotateCcw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, NumberInput, SelectInput } from '@/components/ui/Inputs';
import { Toast } from '@/components/ui/Toast';
import { useSettings } from '@/context/SettingsContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { fmtUsd } from '@/utils/format';
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

  const setIndicator = (key: keyof AppSettings['indicators'], value: number) =>
    setForm((f) => (f ? { ...f, indicators: { ...f.indicators, [key]: value } } : f));

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

  const monthly = form.capital.monthlyInvestmentAmount;
  const coreMonthly = Math.round(monthly * 0.4 * 100) / 100;
  const reserveMonthly = Math.round(monthly * 0.6 * 100) / 100;
  const coreDaily = Math.round((coreMonthly / 30) * 100) / 100;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* 外观 */}
      <Card className="p-6">
        <CardHeader title="外观" subtitle="浅色 / 深色自由切换，选择会保存在本地" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ThemeSelector />
        </div>
      </Card>

      {/* 资金管理 */}
      <Card className="p-6">
        <CardHeader
          title="资金管理"
          subtitle="仅可自定义每月投资金额，策略核心比例与释放规则固定"
          right={
            <Badge tone="slate">
              <Lock className="mr-1 h-3 w-3" />
              策略核心已锁定
            </Badge>
          }
        />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="每月投资金额 (USD)"
            hint="自动拆分：底仓 40% + 加速 60%"
          >
            <NumberInput
              min={1}
              step={100}
              value={monthly}
              onChange={(e) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        capital: {
                          ...f.capital,
                          monthlyInvestmentAmount: Number(e.target.value) || 0,
                        },
                      }
                    : f
                )
              }
            />
          </Field>
          <div className="rounded-xl border border-line bg-inset px-4 py-3 text-xs leading-relaxed text-muted">
            <p className="mb-1 font-medium text-secondary">固定拆分示例（按当前输入）</p>
            <p>长期底仓定投：{fmtUsd(coreMonthly)}（40%）→ 每日 {fmtUsd(coreDaily)}</p>
            <p>加速资金：{fmtUsd(reserveMonthly)}（60%）→ 等待机会分批释放</p>
          </div>
        </div>

        {/* 固定规则展示 */}
        <div className="mt-4 rounded-xl border border-line bg-inset p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            <Lock className="h-3 w-3" />
            固定策略核心（不可修改）
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FixedRule label="资金拆分" value="40% 底仓 / 60% 加速" />
            <FixedRule label="每日底仓" value="底仓月额度 ÷ 30" />
            <FixedRule label="本月使用上限" value="加速资金的 100%" />
            <FixedRule label="轻度机会（1 指标）" value="释放加速资金 10%" />
            <FixedRule label="明显机会（2 指标）" value="释放加速资金 30%" />
            <FixedRule label="极端机会（3 指标）" value="释放加速资金 60%" />
          </div>
          <p className="mt-3 text-[11px] text-faint">
            检测频率：每周日检测一次三个指标（200W MA / MVRV / Puell）。
          </p>
        </div>

        {/* 当前计划实时预览 */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PlanPreview label="每月投入" value={fmtUsd(monthly)} />
          <PlanPreview label="长期底仓（40%）" value={fmtUsd(coreMonthly)} />
          <PlanPreview label="每日自动买入" value={fmtUsd(coreDaily)} />
          <PlanPreview label="加速资金（60%）" value={fmtUsd(reserveMonthly)} />
        </div>
      </Card>

      {/* 我的BTC资产 */}
      <Card className="p-6">
        <CardHeader
          title="我的BTC资产"
          subtitle="只需输入持有数量与平均持仓成本，本金与收益自动计算"
        />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="BTC 持有数量" hint="例如：0.5">
            <NumberInput
              min={0}
              step="0.0001"
              value={form.portfolio.btcAmount}
              onChange={(e) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        portfolio: {
                          ...f.portfolio,
                          btcAmount: Number(e.target.value) || 0,
                        },
                      }
                    : f
                )
              }
            />
          </Field>
          <Field label="平均持仓成本 (USD/BTC)" hint="例如：83151">
            <NumberInput
              min={0}
              step={100}
              value={form.portfolio.avgCost}
              onChange={(e) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        portfolio: {
                          ...f.portfolio,
                          avgCost: Number(e.target.value) || 0,
                        },
                      }
                    : f
                )
              }
            />
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
          <Field label="MVRV 极端阈值" hint="MVRV < 阈值进入极端区域">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.mvrvExtreme} onChange={(e) => setIndicator('mvrvExtreme', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Puell 低估阈值" hint="Puell < 阈值触发">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.puellThreshold} onChange={(e) => setIndicator('puellThreshold', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Puell 极端阈值" hint="Puell < 阈值进入极端区域">
            <NumberInput min={0} max={2} step="0.01" value={form.indicators.puellExtreme} onChange={(e) => setIndicator('puellExtreme', Number(e.target.value) || 0)} />
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

function FixedRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-secondary">{value}</p>
    </div>
  );
}

function PlanPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold tnum text-primary">{value}</p>
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
