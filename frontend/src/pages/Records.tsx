import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Field, NumberInput, SelectInput, TextInput } from '@/components/ui/Inputs';
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { useMarket } from '@/context/MarketDataContext';
import { useRecords } from '@/hooks/useRecords';
import { cn } from '@/utils/cn';
import { fmtQty, fmtUsd, OPPORTUNITY_LABELS, STATE_META } from '@/utils/format';
import type { InvestmentRecord } from '@/types';

const STATE_OPTIONS = [
  { value: 'normal', label: '正常区间' },
  { value: 'slight-undervalued', label: '轻度低估' },
  { value: 'undervalued', label: '明显低估' },
  { value: 'extreme-undervalued', label: '极端低估' },
  { value: 'unknown', label: '未记录' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Records() {
  const { records, loading, error, reload, create, update, remove } = useRecords();
  const { data: market } = useMarket();
  const [editing, setEditing] = useState<InvestmentRecord | null>(null);
  const [form, setForm] = useState({
    date: todayISO(),
    price: '',
    amount: '',
    marketState: 'unknown',
    transactionType: 'manual',
    riskLevel: '2',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setForm({
      date: editing.date,
      price: String(editing.price || ''),
      amount: String(editing.amount || ''),
      marketState: editing.marketState,
      transactionType: editing.transactionType || 'manual',
      riskLevel: String(editing.riskLevel ?? 2),
      note: editing.note ?? '',
    });
  }, [editing]);

  const stats = useMemo(() => {
    const totalInvested = records.reduce((s, r) => s + r.amount, 0);
    const totalBtc = records.reduce((s, r) => s + r.quantity, 0);
    const price = market?.market.price ?? 0;
    const avgCost = totalBtc > 0 ? totalInvested / totalBtc : 0;
    const currentValue = totalBtc * price;
    const pnlPct = totalInvested > 0 ? (currentValue / totalInvested - 1) * 100 : 0;
    return { totalInvested, totalBtc, avgCost, currentValue, pnlPct, price };
  }, [records, market]);

  const computedQty =
    Number(form.amount) > 0 && Number(form.price) > 0
      ? Number(form.amount) / Number(form.price)
      : 0;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const submit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      showToast('请输入有效的投入金额');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        price: form.price ? Number(form.price) : null,
        amount,
        marketState: form.marketState,
        transactionType: form.transactionType,
        riskLevel: form.transactionType === 'acceleration' ? Number(form.riskLevel) : null,
        note: form.note || null,
      };
      if (editing) {
        await update(editing.id, payload);
        showToast('投资记录已更新');
      } else {
        await create(payload);
        showToast('投资记录已添加');
      }
      setEditing(null);
      setForm({
        date: todayISO(),
        price: '',
        amount: '',
        marketState: 'unknown',
        transactionType: 'manual',
        riskLevel: '2',
        note: '',
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const fillCurrentPrice = () => {
    if (stats.price > 0) {
      setForm((f) => ({ ...f, price: String(stats.price) }));
    } else {
      showToast('暂无可用的当前价格，请手动填写');
    }
  };

  const confirmDelete = async (id: string) => {
    if (!window.confirm('确定删除这条投资记录吗？')) return;
    await remove(id);
    showToast('记录已删除');
  };

  return (
    <div className="space-y-5">
      {/* 汇总 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">累计投入</p>
          <p className="mt-1 font-mono text-xl font-bold tnum text-primary">{fmtUsd(stats.totalInvested)}</p>
          <p className="mt-0.5 text-[11px] text-faint">{records.length} 笔记录</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">累计 BTC</p>
          <p className="mt-1 font-mono text-xl font-bold tnum text-accent">{fmtQty(stats.totalBtc, 8)}</p>
          <p className="mt-0.5 text-[11px] text-faint">持仓数量</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">平均成本</p>
          <p className="mt-1 font-mono text-xl font-bold tnum text-primary">{fmtUsd(stats.avgCost)}</p>
          <p className="mt-0.5 text-[11px] text-faint">按持仓加权</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">当前价值</p>
          <p className="mt-1 font-mono text-xl font-bold tnum text-primary">{fmtUsd(stats.currentValue)}</p>
          <p className="mt-0.5 text-[11px] text-faint">按 {fmtUsd(stats.price, 0)} 估算</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">浮动收益</p>
          <p
            className={cn(
              'mt-1 font-mono text-xl font-bold tnum',
              stats.pnlPct >= 0 ? 'text-up' : 'text-down'
            )}
          >
            {stats.pnlPct >= 0 ? '+' : ''}
            {stats.pnlPct.toFixed(1)}%
          </p>
          <p className="mt-0.5 text-[11px] text-faint">相对成本</p>
        </Card>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        {/* 录入表单 */}
        <Card className="p-6 xl:sticky xl:top-20">
          <CardHeader
            title={editing ? '编辑投资记录' : '记录一笔真实投资'}
            subtitle="记录日期、价格与投入金额"
            right={
              editing ? (
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  取消
                </Button>
              ) : undefined
            }
          />

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="日期">
                <TextInput
                  type="date"
                  max={todayISO()}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field label="BTC 价格 (USD)">
                <div className="relative">
                  <NumberInput
                    min={0}
                    placeholder="如 85000"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                  <button
                    onClick={fillCurrentPrice}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-accent hover:opacity-80"
                  >
                    当前价
                  </button>
                </div>
              </Field>
            </div>

            <Field label="投入金额 (USD)">
              <NumberInput
                min={0}
                placeholder="如 500"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </Field>

            <div className="rounded-lg border border-line bg-inset px-3 py-2 text-xs text-muted">
              预计买入：<span className="font-mono tnum text-secondary">{fmtQty(computedQty, 8)} BTC</span>
              {computedQty > 0 && Number(form.price) > 0 && (
                <span className="ml-1.5">（{fmtUsd(Number(form.price), 0)}/BTC）</span>
              )}
            </div>

            <Field label="市场状态">
              <SelectInput
                value={form.marketState}
                onChange={(e) => setForm((f) => ({ ...f, marketState: e.target.value }))}
              >
                {STATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="交易类型">
                <SelectInput
                  value={form.transactionType}
                  onChange={(e) => setForm((f) => ({ ...f, transactionType: e.target.value }))}
                >
                  <option value="manual">手动记录</option>
                  <option value="core">长期底仓定投</option>
                  <option value="acceleration">加速买入</option>
                </SelectInput>
              </Field>
              {form.transactionType === 'acceleration' ? (
                <Field label="风险等级">
                  <SelectInput
                    value={form.riskLevel}
                    onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value }))}
                  >
                    <option value="1">轻度机会（1 个指标）</option>
                    <option value="2">明显机会（2 个指标）</option>
                    <option value="3">极端机会（3 个指标）</option>
                  </SelectInput>
                </Field>
              ) : (
                <div className="flex items-end pb-1 text-[11px] text-faint">
                  {form.transactionType === 'core' ? '底仓每日自动买入' : '手动记录真实投资'}
                </div>
              )}
            </div>

            <Field label="备注" hint="例如：MVRV 进入低估区域">
              <TextInput
                placeholder="可选"
                maxLength={200}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </Field>

            <Button variant="primary" className="w-full" onClick={() => void submit()} loading={saving}>
              <Plus className="h-4 w-4" />
              {editing ? '保存修改' : '添加记录'}
            </Button>
          </div>
        </Card>

        {/* 记录表格 */}
        <Card className="p-6 xl:col-span-2">
          <CardHeader title="投资记录" subtitle="按日期倒序排列" />
          <div className="mt-4">
            {loading ? (
              <LoadingBlock label="加载记录…" />
            ) : error ? (
              <ErrorBlock message={error} onRetry={() => void reload()} />
            ) : records.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-10 w-10" />}
                title="还没有投资记录"
                subtitle="添加你的第一笔真实投资，系统将自动汇总持仓与成本。"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-line-strong text-left text-[11px] uppercase tracking-wider text-muted">
                      <th className="pb-2.5 pr-4 font-medium">日期</th>
                      <th className="pb-2.5 pr-4 font-medium">类型</th>
                      <th className="pb-2.5 pr-4 font-medium">BTC 价格</th>
                      <th className="pb-2.5 pr-4 font-medium">投入金额</th>
                      <th className="pb-2.5 pr-4 font-medium">BTC 数量</th>
                      <th className="pb-2.5 pr-4 font-medium">市场状态</th>
                      <th className="pb-2.5 pr-4 font-medium">备注</th>
                      <th className="pb-2.5 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const meta = STATE_META[r.marketState] ?? STATE_META.unknown;
                      return (
                        <tr key={r.id} className="border-b border-line last:border-0 hover:bg-inset">
                          <td className="py-3 pr-4 font-mono tnum text-secondary">{r.date}</td>
                          <td className="py-3 pr-4">
                            {r.transactionType === 'acceleration' ? (
                              <Badge tone="amber">
                                加速买入{r.riskLevel ? ` · ${OPPORTUNITY_LABELS[r.riskLevel]}` : ''}
                              </Badge>
                            ) : r.transactionType === 'core' ? (
                              <Badge tone="cyan">长期底仓定投</Badge>
                            ) : (
                              <Badge tone="slate">手动</Badge>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-mono tnum text-secondary">{fmtUsd(r.price)}</td>
                          <td className="py-3 pr-4 font-mono tnum text-primary">{fmtUsd(r.amount)}</td>
                          <td className="py-3 pr-4 font-mono tnum text-accent">{fmtQty(r.quantity, 8)}</td>
                          <td className="py-3 pr-4">
                            <Badge tone={r.marketState === 'undervalued' ? 'amber' : r.marketState === 'extreme-undervalued' ? 'green' : r.marketState === 'slight-undervalued' ? 'cyan' : 'slate'}>
                              {meta.label}
                            </Badge>
                          </td>
                          <td className="max-w-[160px] truncate py-3 pr-4 text-xs text-muted" title={r.note ?? ''}>
                            {r.note ?? '—'}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditing(r)}
                                className="rounded-md p-1.5 text-muted hover:bg-inset hover:text-accent"
                                title="编辑"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => void confirmDelete(r.id)}
                                className="rounded-md p-1.5 text-muted hover:bg-inset hover:text-down"
                                title="删除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Toast message={toast} />
    </div>
  );
}
