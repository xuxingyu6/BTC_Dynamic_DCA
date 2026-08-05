import { Zap, Play, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { fmtUsd, OPPORTUNITY_LABELS } from '@/utils/format';
import type { ReserveStatus } from '@/types';

const STATUS_META: Record<ReserveStatus['status'], { label: string; tone: 'green' | 'amber' | 'red'; dot: string; emoji: string }> = {
  available: { label: '等待机会', tone: 'green', dot: 'bg-up', emoji: '🟢' },
  partial: { label: '部分使用', tone: 'amber', dot: 'bg-warn', emoji: '🟡' },
  exhausted: { label: '已用完', tone: 'red', dot: 'bg-down', emoji: '🔴' },
};

const LEVEL_META: Record<number, { label: string; tone: 'green' | 'amber' | 'cyan' | 'red' }> = {
  1: { label: '轻度机会', tone: 'cyan' },
  2: { label: '明显机会', tone: 'amber' },
  3: { label: '极端机会', tone: 'green' },
};

export function AccelerationPanel({
  reserve,
  loading,
  deploying,
  message,
  onDeploy,
  onReset,
}: {
  reserve: ReserveStatus | null;
  loading: boolean;
  deploying: boolean;
  message: string | null;
  onDeploy: () => void;
  onReset: () => void;
}) {
  const status = reserve ? STATUS_META[reserve.status] : null;
  const levelMeta = reserve && reserve.level > 0 ? LEVEL_META[reserve.level] : null;
  const canDeploy =
    !!reserve && reserve.level > 0 && reserve.balance > 0 && reserve.monthlyRemaining > 0;

  const monthlyPct = reserve ? Math.min(100, reserve.monthlyDeploymentPct) : 0;
  const available = reserve ? reserve.carryover + reserve.monthlyAdded : 0;
  const remainingPct = reserve && available > 0 ? Math.min(100, (reserve.balance / available) * 100) : 0;
  const rulePct = (lvl: 1 | 2 | 3) => reserve?.rules[`level${lvl}Pct`] ?? (lvl === 1 ? 10 : lvl === 2 ? 30 : 60);

  return (
    <Card className="flex h-full flex-col p-6">
      <CardHeader
        title="加速资金管理"
        subtitle="每周日检测三个指标 · 未使用资金跨月自动保留"
        right={
          status ? (
            <Badge tone={status.tone} dot={status.dot}>
              {status.emoji} {status.label}
            </Badge>
          ) : (
            <Badge tone="slate">加载中</Badge>
          )
        }
      />

      {/* 市场风险评分 */}
      <div className="relative mt-4 overflow-hidden rounded-xl border border-accent/20 bg-accent/[0.06] p-4">
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              BTC 市场风险评分
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-2.5 w-7 rounded-full transition-colors',
                    reserve && i < reserve.triggered
                      ? 'bg-accent shadow-[0_0_10px_var(--glow-soft)]'
                      : 'bg-inset'
                  )}
                />
              ))}
              <span className="ml-1 font-mono text-lg font-bold tnum text-primary">
                {reserve?.triggered ?? '--'}
                <span className="text-xs text-muted"> / 3</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              当前机会等级
            </p>
            {levelMeta ? (
              <Badge tone={levelMeta.tone} className="mt-1">
                {levelMeta.label} · 释放 {rulePct(reserve!.level as 1 | 2 | 3)}%
              </Badge>
            ) : (
              <Badge tone="slate" className="mt-1">
                正常区域
              </Badge>
            )}
          </div>
        </div>

        <div className="relative mt-3 flex items-end justify-between border-t border-line pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted">本次释放</p>
            <p className="mt-0.5 text-sm text-secondary">
              {reserve && reserve.level > 0 ? (
                <>
                  建议释放{' '}
                  <span className="text-glow font-mono text-2xl font-bold tnum text-accent">
                    {fmtUsd(Math.min(reserve.deploySuggestion, reserve.balance, reserve.monthlyRemaining))}
                  </span>{' '}
                  加速资金
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-muted">
                  <Clock className="h-3.5 w-3.5" /> 等待机会
                </span>
              )}
            </p>
          </div>
          {reserve && reserve.level > 0 && (
            <span className="font-mono text-xs tnum text-faint">
              本月额度 {fmtUsd(reserve.monthlyAdded)} × {reserve.deployPct}%
            </span>
          )}
        </div>
      </div>

      {/* 资金池状态 */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MiniStat label="累计余额" value={fmtUsd(reserve?.balance)} />
        <MiniStat label="本月新增" value={fmtUsd(reserve?.monthlyAdded)} accent="text-accent" />
        <MiniStat label="历史剩余" value={fmtUsd(reserve?.carryover)} />
        <MiniStat label="本月已使用" value={fmtUsd(reserve?.deployedThisMonth)} accent="text-warn" />
        <MiniStat
          label="本月剩余机会"
          value={reserve ? `${reserve.opportunities.remaining}次` : '--'}
          sub={reserve?.opportunities.dates.length ? reserve.opportunities.dates.map((d) => d.slice(5).replace('-', '/')).join('、') : '本月已无检测日'}
        />
      </div>

      {/* 月度使用进度 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] text-muted">
          <span>本月使用进度（已使用 / 本月可用）</span>
          <span>
            {fmtUsd(reserve?.deployedThisMonth)} / {fmtUsd(reserve?.monthlyLimit)}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-inset">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              reserve?.status === 'exhausted'
                ? 'bg-down/70'
                : monthlyPct >= 60
                  ? 'bg-warn/70'
                  : 'bg-accent/70'
            )}
            style={{ width: `${monthlyPct}%` }}
          />
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-inset">
          <div className="h-full rounded-full bg-muted/30" style={{ width: `${remainingPct}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-faint">
          <span>累计余额占本月可用（历史剩余 + 本月新增）</span>
          <span>{remainingPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* 机会等级阶段 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {([1, 2, 3] as const).map((lvl) => {
          const meta = LEVEL_META[lvl];
          const active = reserve?.level === lvl;
          return (
            <div
              key={lvl}
              className={cn(
                'rounded-lg border px-2 py-2 text-center transition-all',
                active
                  ? meta.tone === 'green'
                    ? 'border-up/40 bg-up/10'
                    : meta.tone === 'amber'
                      ? 'border-warn/40 bg-warn/10'
                      : 'border-accent/40 bg-accent/10'
                  : 'border-line bg-inset'
              )}
            >
              <p className={cn('text-[10px] font-bold', active ? 'text-primary' : 'text-muted')}>
                {meta.label}
              </p>
              <p className={cn('font-mono text-xs tnum', active ? 'text-secondary' : 'text-faint')}>
                {rulePct(lvl)}%
              </p>
            </div>
          );
        })}
      </div>

      {/* 长期底仓 + 加速资金池状态 */}
      <div className="mt-4 space-y-2 rounded-xl border border-line bg-inset p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
            </span>
            长期底仓定投 · 每日 {fmtUsd(reserve?.allocation.coreDaily)}
            <span className="text-faint">(本月 {fmtUsd(reserve?.allocation.coreMonthly)})</span>
          </span>
          <span className="flex items-center gap-1 text-up">
            <CheckCircle2 className="h-3.5 w-3.5" /> 每日自动执行
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-muted">
            <Zap className="h-3.5 w-3.5 text-warn" />
            加速资金池 · 累计余额 {fmtUsd(reserve?.balance)}
          </span>
          <span className={cn('font-medium', reserve?.status === 'exhausted' ? 'text-down' : 'text-warn')}>
            {reserve?.status === 'exhausted'
              ? '加速资金已用完'
              : reserve?.level && reserve.level > 0
                ? `正在释放 · ${OPPORTUNITY_LABELS[reserve.level]}`
                : '等待机会'}
          </span>
        </div>
      </div>

      {/* 操作 */}
      {message && (
        <p className="mt-3 rounded-lg border border-line bg-inset px-3 py-2 text-[11px] text-muted">
          {message}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={onDeploy}
          disabled={!canDeploy}
          loading={deploying}
          title={canDeploy ? '记录并执行本次加速买入' : '当前无释放机会或资金已用完'}
        >
          <Play className="h-3.5 w-3.5" />
          记录本次加速买入
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset} title="重置资金池（新周期 / 测试）">
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">重置</span>
        </Button>
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-inset px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={cn('mt-0.5 font-mono text-base font-bold tnum text-primary', accent)}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-faint">{sub}</p>}
    </div>
  );
}
