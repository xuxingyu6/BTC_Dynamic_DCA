import { CalendarClock, Landmark, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { fmtQty, fmtUsd } from '@/utils/format';
import type { PortfolioStatus, ReserveStatus } from '@/types';

/**
 * Dashboard 资金与持仓总览：
 *   - BTC 资金计划：每月投资金额按固定 40/60 拆分
 *   - 加速资金状态：滚动资金池（累计余额 / 本月新增 / 历史剩余 / 已使用）
 *   - 我的BTC资产：手动录入持仓，自动计算的收益统计
 */
export function FundingPlanCards({
  reserve,
  portfolio,
}: {
  reserve: ReserveStatus | null;
  portfolio: PortfolioStatus | null;
}) {
  const allocation = reserve?.allocation;

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {/* BTC 资金计划 */}
      <Card className="p-6">
        <CardHeader
          title="BTC 资金计划"
          subtitle="每月投资金额按固定比例自动拆分（40% 底仓 / 60% 加速）"
          right={<Landmark className="h-5 w-5 text-accent" />}
        />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <PlanStat label="每月投入" value={fmtUsd(allocation?.monthlyInvestmentAmount)} />
          <PlanStat
            label="长期底仓（40%）"
            value={fmtUsd(allocation?.coreMonthly)}
            sub="每月固定买入"
          />
          <PlanStat
            label="每日自动买入"
            value={fmtUsd(allocation?.coreDaily)}
            sub={`底仓 ÷ 30 天`}
          />
          <PlanStat
            label="本月新增加速（60%）"
            value={fmtUsd(allocation?.reserveMonthly)}
            sub="每月进入加速资金池"
          />
        </div>
      </Card>

      {/* 加速资金状态（滚动资金池） */}
      <Card className="p-6">
        <CardHeader
          title="加速资金状态"
          subtitle="未使用资金跨月自动保留 · 每周日检测"
          right={
            <Badge
              tone={
                reserve?.status === 'exhausted'
                  ? 'red'
                  : reserve?.status === 'partial'
                    ? 'amber'
                    : 'green'
              }
            >
              {reserve?.status === 'exhausted'
                ? '资金已用完'
                : reserve?.status === 'partial'
                  ? '部分使用'
                  : '等待机会'}
            </Badge>
          }
        />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <PlanStat label="累计余额" value={fmtUsd(reserve?.balance)} accent="text-up" />
          <PlanStat label="本月新增" value={fmtUsd(reserve?.monthlyAdded)} />
          <PlanStat label="历史剩余" value={fmtUsd(reserve?.carryover)} />
          <PlanStat label="本月已使用" value={fmtUsd(reserve?.deployedThisMonth)} accent="text-warn" />
        </div>
        <p className="mt-3 flex items-center justify-between text-[11px] text-muted">
          <span>
            累计余额 = 历史剩余 + 本月新增 − 已使用
          </span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <p className="rounded-lg border border-line bg-inset px-2.5 py-2 text-muted">
            本月剩余机会：
            <span className="ml-1 font-mono font-bold text-primary">
              {reserve ? `${reserve.opportunities.remaining}次` : '--'}
            </span>
          </p>
          <p className="rounded-lg border border-line bg-inset px-2.5 py-2 text-muted">
            累计已使用：
            <span className="ml-1 font-mono font-bold text-primary">{fmtUsd(reserve?.used)}</span>
          </p>
        </div>
        {reserve?.opportunities.nextCheck && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-line bg-inset px-3 py-2 text-[11px] text-muted">
            <CalendarClock className="h-3.5 w-3.5 text-accent" />
            下次检测：{reserve.opportunities.nextCheck}（周日）
          </p>
        )}
      </Card>

      {/* 我的BTC资产 */}
      <PortfolioCard portfolio={portfolio} />
    </div>
  );
}

/** 我的BTC资产卡片：手动录入持仓，自动计算收益统计 */
export function PortfolioCard({ portfolio }: { portfolio: PortfolioStatus | null }) {
  const pnlPositive = (portfolio?.pnl ?? 0) >= 0;
  return (
    <Card className="p-6">
      <CardHeader
        title="我的BTC资产"
        subtitle="手动录入持有数量与平均成本，收益自动计算"
        right={<Wallet className="h-5 w-5 text-up" />}
      />
      <div className="mt-5 grid grid-cols-2 gap-3">
        <PlanStat label="BTC 数量" value={fmtQty(portfolio?.btcAmount, 8)} />
        <PlanStat label="平均成本" value={fmtUsd(portfolio?.avgCost)} />
        <PlanStat label="当前价格" value={fmtUsd(portfolio?.price, 0)} />
        <PlanStat label="持仓本金" value={fmtUsd(portfolio?.principal)} />
        <PlanStat label="当前价值" value={fmtUsd(portfolio?.currentValue)} accent="text-up" />
        <PlanStat
          label="浮动收益"
          value={`${pnlPositive ? '+' : ''}${fmtUsd(portfolio?.pnl)}`}
          accent={pnlPositive ? 'text-up' : 'text-down'}
        />
      </div>
      <div
        className={cn(
          'mt-3 rounded-lg border px-3 py-2 text-sm font-bold',
          pnlPositive ? 'border-up/30 bg-up/10 text-up' : 'border-down/30 bg-down/10 text-down'
        )}
      >
        收益率：{portfolio ? `${portfolio.pnlPct >= 0 ? '+' : ''}${portfolio.pnlPct.toFixed(2)}%` : '--'}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-faint">
        持仓本金 = BTC 数量 × 平均成本；当前价值 = BTC 数量 × 当前价格；
        收益率 = (当前价格 − 平均成本) ÷ 平均成本。
        可在「参数设置 → 我的BTC资产」中修改持仓数据。
      </p>
    </Card>
  );
}

function PlanStat({
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
    <div className="rounded-xl border border-line bg-inset px-3.5 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold tnum text-primary ${accent ?? ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-faint">{sub}</p>}
    </div>
  );
}
