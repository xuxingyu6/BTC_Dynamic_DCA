import type { DailyBar } from '../types/market';
import { buildIndicatorSeries } from '../strategy-engine/indicators/historyIndicators';
import {
  CORE_RATIO,
  LEVEL1_RELEASE,
  LEVEL2_RELEASE,
  LEVEL3_RELEASE,
  RESERVE_RATIO,
} from '../strategy-engine/acceleration/fixedRules';
import {
  DAY_MS,
  addDays,
  daysInMonth,
  eachDay,
  parseISODate,
  toISODate,
} from '../utils/time';
import { round2, round8 } from '../utils/numbers';

/**
 * 回测引擎：基于相同总预算比较「普通 DCA」与「动态 DCA」。
 *
 * 核心原则：两个策略必须投入相同本金，否则比较无意义。
 *
 * 策略 A（普通 DCA）：
 *   每月投入预算按日平均买入，不考虑任何市场指标。
 *
 * 策略 B（动态 DCA）：
 *   总预算与策略 A 完全相同，资金结构固定：
 *     - 40% 长期底仓：每日自动买入
 *     - 60% 加速资金：每月进入储备池，指标触发时固定按“本月加速额度 × 比例”释放
 *       （轻度 10% / 明显 30% / 极端 60%，不因余额递减），未使用资金跨月保留；
 *       期末剩余储备一次性投入，保证两策略总本金一致。
 *
 * 结束时会执行资金公平校验：|投入A − 投入B| 必须为 0，否则禁止比较。
 * 手续费按 feeRatePct 从买入金额中扣除。
 */

export interface BacktestRequest {
  asset?: 'btc';
  startDate: string;
  endDate: string;
  /** 每月投入预算（USD），总预算 = 区间月数 × 每月投入 */
  monthlyInvestmentAmount: number;
  ma200Multiplier: number;
  mvrvThreshold: number;
  puellThreshold: number;
  feeRatePct: number;
}

export interface StrategyMetrics {
  totalInvested: number;
  btcAccumulated: number;
  avgCost: number;
  currentValue: number;
  returnPct: number;
  cagrPct: number | null;
  /** 最大回撤（正数，例如 52 表示 -52%） */
  maxDrawdownPct: number;
}

export interface BacktestDayPoint {
  date: string;
  price: number;
  ma200w: number | null;
  portfolioA: number;
  portfolioB: number;
  investedA: number;
  investedB: number;
}

export interface BuyPoint {
  date: string;
  price: number;
  amount: number;
  strategy: 'A' | 'B';
  level: number;
}

export interface FairnessCheck {
  fair: boolean;
  investedA: number;
  investedB: number;
  diff: number;
  totalBudget: number;
  months: number;
}

export interface BacktestResult {
  request: BacktestRequest;
  dataSource: string;
  generatedAt: string;
  days: number;
  buyCount: number;
  /** 资金公平校验：两个策略投入本金必须一致 */
  fairness: FairnessCheck;
  summary: {
    a: StrategyMetrics;
    b: StrategyMetrics;
    delta: {
      extraBtc: number;
      /** BTC 数量提升比例：动态相对普通 */
      btcGainPct: number;
      returnDeltaPct: number;
      avgCostDeltaPct: number;
    };
  };
  points: BacktestDayPoint[];
  buyPoints: BuyPoint[];
}

interface MonthPlan {
  year: number;
  month: number;
  budget: number;
  coreMonthly: number;
  activeDays: number;
  firstDay: Date;
  lastDay: Date;
}

function computeMetrics(invested: number, units: number, price: number, days: number): StrategyMetrics {
  const currentValue = units * price;
  const returnPct = invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
  const cagrPct =
    invested > 0 && currentValue > 0 && days >= 30
      ? (Math.pow(currentValue / invested, 365 / days) - 1) * 100
      : null;
  return {
    totalInvested: round2(invested),
    btcAccumulated: round8(units),
    avgCost: round2(invested / (units || 1)),
    currentValue: round2(currentValue),
    returnPct: round2(returnPct),
    cagrPct: cagrPct === null ? null : round2(cagrPct),
    maxDrawdownPct: 0,
  };
}

function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const out: T[] = [];
  const step = arr.length / target;
  for (let i = 0; i < target; i++) out.push(arr[Math.floor(i * step)]);
  out[out.length - 1] = arr[arr.length - 1];
  return out;
}

/** 按日历月拆分预算：与区间相交的月份分配“每月投入预算”，部分月份按天数比例折算 */
function buildMonthPlans(start: Date, end: Date, monthlyInvestmentAmount: number): MonthPlan[] {
  const plans: MonthPlan[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonthStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor <= endMonthStart) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const dim = daysInMonth(year, month);
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month, dim));
    const firstDay = monthStart < start ? start : monthStart;
    const lastDay = monthEnd > end ? end : monthEnd;
    const activeDays = Math.round((lastDay.getTime() - firstDay.getTime()) / DAY_MS) + 1;
    const budget = (monthlyInvestmentAmount * activeDays) / dim;
    plans.push({
      year,
      month,
      budget,
      coreMonthly: budget * CORE_RATIO,
      activeDays,
      firstDay,
      lastDay,
    });
    cursor = new Date(Date.UTC(year, month + 1, 1));
  }
  return plans;
}

function releaseRatio(score: number): number {
  switch (score) {
    case 1:
      return LEVEL1_RELEASE;
    case 2:
      return LEVEL2_RELEASE;
    case 3:
      return LEVEL3_RELEASE;
    default:
      return 0;
  }
}

export function runBacktest(req: BacktestRequest, bars: DailyBar[], dataSource: string): BacktestResult {
  const series = buildIndicatorSeries(bars);
  const priceMap = new Map(bars.map((b) => [b.date, b.price]));

  const firstBar = parseISODate(bars[0].date);
  const lastBar = parseISODate(bars[bars.length - 1].date);
  const start = parseISODate(req.startDate) < firstBar ? firstBar : parseISODate(req.startDate);
  const end = parseISODate(req.endDate) > lastBar ? lastBar : parseISODate(req.endDate);
  if (end < start) throw new Error('回测日期区间无效或超出数据范围');

  // ---- 预算拆分：按月分配，总预算固定 ----
  const monthPlans = buildMonthPlans(start, end, req.monthlyInvestmentAmount);
  const totalBudget = monthPlans.reduce((s, m) => s + m.budget, 0);

  // 每日计划金额
  const dailyPlan = new Map<string, { amountA: number; coreB: number }>();
  for (const mo of monthPlans) {
    const amountA = mo.budget / mo.activeDays;
    const coreB = mo.coreMonthly / mo.activeDays;
    for (let d = mo.firstDay; d <= mo.lastDay; d = addDays(d, 1)) {
      dailyPlan.set(toISODate(d), { amountA, coreB });
    }
  }

  const feeFactor = 1 - req.feeRatePct / 100;
  let unitsA = 0;
  let unitsB = 0;
  let investedA = 0;
  let investedB = 0;
  let reservePool = 0; // 加速资金储备池（跨月保留）
  let pendingA = 0; // 无价格日的普通 DCA 挂账金额
  let pendingCore = 0; // 无价格日的底仓挂账金额
  const cashHistory = new Map<string, number>(); // 动态 DCA 每日未投入现金（储备池）
  const unitsAHistory = new Map<string, number>(); // 普通 DCA 逐日累计持仓
  const unitsBHistory = new Map<string, number>(); // 动态 DCA 逐日累计持仓
  let monthlyAccelBudget = 0; // 本月加速资金额度（固定释放基数）
  let usedAccelThisMonth = 0; // 本月已使用加速金额
  const buyPoints: BuyPoint[] = [];

  const daysInRange = eachDay(start, end);
  for (const d of daysInRange) {
    const iso = toISODate(d);
    const plan = dailyPlan.get(iso);
    const price = priceMap.get(iso);
    if (!plan) continue;

    // 每月新增加速资金进入储备池（按活跃天数比例）
    const monthPlan = monthPlans.find((m) => m.firstDay <= d && d <= m.lastDay);
    if (monthPlan && d.getTime() === monthPlan.firstDay.getTime()) {
      monthlyAccelBudget = monthPlan.budget * RESERVE_RATIO;
      usedAccelThisMonth = 0;
      reservePool += monthlyAccelBudget;
    }

    if (!price) {
      pendingA += plan.amountA;
      pendingCore += plan.coreB;
      continue;
    }

    const amountA = plan.amountA + pendingA;
    const coreB = plan.coreB + pendingCore;
    pendingA = 0;
    pendingCore = 0;

    // 当日指标评分（无未来函数）
    const ma = series.ma200w.get(iso) ?? null;
    const mvrv = series.mvrv.get(iso) ?? null;
    const puell = series.puell.get(iso) ?? null;
    let score = 0;
    if (ma !== null && price <= ma * req.ma200Multiplier) score++;
    if (mvrv !== null && mvrv < req.mvrvThreshold) score++;
    if (puell !== null && puell < req.puellThreshold) score++;

    // 策略 A：普通 DCA，每日平均投入
    unitsA += (amountA * feeFactor) / price;
    investedA += amountA;
    buyPoints.push({ date: iso, price, amount: round2(amountA), strategy: 'A', level: 0 });
    unitsAHistory.set(iso, unitsA);

    // 策略 B：长期底仓每日自动买入
    unitsB += (coreB * feeFactor) / price;
    investedB += coreB;
    buyPoints.push({ date: iso, price, amount: round2(coreB), strategy: 'B', level: 0 });
    unitsBHistory.set(iso, unitsB);

    // 策略 B：加速资金固定按“本月加速额度 × 比例”释放（10% / 30% / 60%，不递减）
    if (score >= 1 && reservePool > 0.005) {
      const amount = Math.min(
        monthlyAccelBudget * releaseRatio(score),
        monthlyAccelBudget - usedAccelThisMonth,
        reservePool
      );
      if (amount >= 0.005) {
        unitsB += (amount * feeFactor) / price;
        investedB += amount;
        reservePool -= amount;
        usedAccelThisMonth += amount;
        buyPoints.push({ date: iso, price, amount: round2(amount), strategy: 'B', level: score });
        unitsBHistory.set(iso, unitsB);
      }
    }

    cashHistory.set(iso, reservePool);
  }

  const finalPrice = priceMap.get(toISODate(end)) ?? priceMap.get(toISODate(daysInRange[daysInRange.length - 1])) ?? 0;

  // 兜底：无价格日的挂账金额按期末价格补投（保证本金完整）
  if (finalPrice > 0) {
    if (pendingA >= 0.005) {
      unitsA += (pendingA * feeFactor) / finalPrice;
      investedA += pendingA;
      buyPoints.push({ date: toISODate(end), price: finalPrice, amount: round2(pendingA), strategy: 'A', level: 0 });
      pendingA = 0;
    }
    if (pendingCore >= 0.005) {
      unitsB += (pendingCore * feeFactor) / finalPrice;
      investedB += pendingCore;
      buyPoints.push({ date: toISODate(end), price: finalPrice, amount: round2(pendingCore), strategy: 'B', level: 0 });
      pendingCore = 0;
    }
    // 期末剩余加速资金一次性投入，保证总本金一致
    if (reservePool >= 0.005) {
      unitsB += (reservePool * feeFactor) / finalPrice;
      investedB += reservePool;
      buyPoints.push({ date: toISODate(end), price: finalPrice, amount: round2(reservePool), strategy: 'B', level: 0 });
      reservePool = 0;
    }
    cashHistory.set(toISODate(end), 0);
  }
  unitsAHistory.set(toISODate(end), unitsA);
  unitsBHistory.set(toISODate(end), unitsB);

  if (unitsA === 0 && unitsB === 0) {
    throw new Error('该日期区间内没有可执行的定投日（可能超出数据范围）');
  }

  // ---- 逐日组合净值（用于最大回撤与图表） ----
  const points: BacktestDayPoint[] = [];
  let peakA = -Infinity;
  let peakB = -Infinity;
  let maxDdA = 0;
  let maxDdB = 0;

  for (const d of daysInRange) {
    const iso = toISODate(d);
    const price = priceMap.get(iso);
    if (!price) continue;
    const uA = unitsAHistory.get(iso) ?? 0;
    const uB = unitsBHistory.get(iso) ?? 0;
    const valueA = uA * price;
    // 动态 DCA 账户净值 = 持仓市值 + 未投入的加速资金现金
    const valueB = uB * price + (cashHistory.get(iso) ?? 0);
    peakA = Math.max(peakA, valueA);
    peakB = Math.max(peakB, valueB);
    if (peakA > 0) maxDdA = Math.min(maxDdA, (valueA - peakA) / peakA);
    if (peakB > 0) maxDdB = Math.min(maxDdB, (valueB - peakB) / peakB);
    points.push({
      date: iso,
      price,
      ma200w: series.ma200w.get(iso) ?? null,
      portfolioA: round2(valueA),
      portfolioB: round2(valueB),
      investedA: round2(investedA),
      investedB: round2(investedB),
    });
  }

  const days = points.length;
  const metricsA = computeMetrics(investedA, unitsA, finalPrice, days);
  const metricsB = computeMetrics(investedB, unitsB, finalPrice, days);
  metricsA.maxDrawdownPct = round2(Math.abs(maxDdA) * 100);
  metricsB.maxDrawdownPct = round2(Math.abs(maxDdB) * 100);

  const diff = investedA - investedB;
  const fair = Math.abs(diff) < 0.01;
  const extraBtc = unitsB - unitsA;

  return {
    request: req,
    dataSource,
    generatedAt: new Date().toISOString(),
    days,
    buyCount: buyPoints.length,
    fairness: {
      fair,
      investedA: round2(investedA),
      investedB: round2(investedB),
      diff: round2(diff),
      totalBudget: round2(totalBudget),
      months: monthPlans.length,
    },
    summary: {
      a: metricsA,
      b: metricsB,
      delta: {
        extraBtc: round8(extraBtc),
        btcGainPct: round2(unitsA > 0 ? (extraBtc / unitsA) * 100 : 0),
        returnDeltaPct: round2(metricsB.returnPct - metricsA.returnPct),
        avgCostDeltaPct: round2(metricsA.avgCost - metricsB.avgCost),
      },
    },
    points: downsample(points, 900),
    buyPoints: downsample(buyPoints, 1200),
  };
}
