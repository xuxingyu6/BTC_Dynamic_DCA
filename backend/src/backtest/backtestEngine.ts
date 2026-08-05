import type { DailyBar } from '../types/market';
import { buildIndicatorSeries } from '../strategy-engine/indicators/historyIndicators';
import type { Frequency } from '../strategy-engine/types';
import {
  addDays,
  addMonthsClamped,
  eachDay,
  parseISODate,
  toISODate,
} from '../utils/time';
import { round2, round8 } from '../utils/numbers';

/**
 * 回测引擎：比较「普通 DCA」与「动态 DCA」。
 *
 * 每个定投日根据当日已知指标（无未来函数）计算触发数量，
 * 策略 B 投入 = 基础金额 + 对应 Level 加仓；策略 A 始终投入基础金额。
 * 手续费按 feeRatePct 从买入金额中扣除。
 */

export interface BacktestRequest {
  asset?: 'btc';
  startDate: string;
  endDate: string;
  frequency: Frequency;
  baseAmount: number;
  level1Amount: number;
  level2Amount: number;
  level3Amount: number;
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

export interface BacktestResult {
  request: BacktestRequest;
  dataSource: string;
  generatedAt: string;
  days: number;
  buyCount: number;
  summary: {
    a: StrategyMetrics;
    b: StrategyMetrics;
    delta: {
      extraInvested: number;
      extraBtc: number;
      returnDeltaPct: number;
      avgCostDeltaPct: number;
    };
  };
  points: BacktestDayPoint[];
  buyPoints: BuyPoint[];
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

export function runBacktest(req: BacktestRequest, bars: DailyBar[], dataSource: string): BacktestResult {
  const series = buildIndicatorSeries(bars);
  const priceMap = new Map(bars.map((b) => [b.date, b.price]));

  const firstBar = parseISODate(bars[0].date);
  const lastBar = parseISODate(bars[bars.length - 1].date);
  const start = parseISODate(req.startDate) < firstBar ? firstBar : parseISODate(req.startDate);
  const end = parseISODate(req.endDate) > lastBar ? lastBar : parseISODate(req.endDate);
  if (end < start) throw new Error('回测日期区间无效或超出数据范围');

  // ---- 定投计划 ----
  const schedule: Date[] =
    req.frequency === 'daily'
      ? eachDay(start, end)
      : (() => {
          const out: Date[] = [];
          let d = start;
          while (d <= end) {
            out.push(d);
            d = req.frequency === 'weekly' ? addDays(d, 7) : addMonthsClamped(d, 1);
          }
          return out;
        })();

  const feeFactor = 1 - req.feeRatePct / 100;
  let unitsA = 0;
  let unitsB = 0;
  let investedA = 0;
  let investedB = 0;
  const buyPoints: BuyPoint[] = [];

  for (const d of schedule) {
    const iso = toISODate(d);
    const price = priceMap.get(iso);
    if (!price) continue;

    const ma = series.ma200w.get(iso) ?? null;
    const mvrv = series.mvrv.get(iso) ?? null;
    const puell = series.puell.get(iso) ?? null;

    let score = 0;
    if (ma !== null && price <= ma * req.ma200Multiplier) score++;
    if (mvrv !== null && mvrv < req.mvrvThreshold) score++;
    if (puell !== null && puell < req.puellThreshold) score++;

    const extra =
      score === 0 ? 0 : score === 1 ? req.level1Amount : score === 2 ? req.level2Amount : req.level3Amount;
    const amountB = req.baseAmount + extra;

    unitsA += (req.baseAmount * feeFactor) / price;
    unitsB += (amountB * feeFactor) / price;
    investedA += req.baseAmount;
    investedB += amountB;

    buyPoints.push({ date: iso, price, amount: req.baseAmount, strategy: 'A', level: 0 });
    buyPoints.push({ date: iso, price, amount: amountB, strategy: 'B', level: score });
  }

  if (unitsA === 0 && unitsB === 0) {
    throw new Error('该日期区间内没有可执行的定投日（可能超出数据范围）');
  }

  // ---- 逐日组合净值（用于最大回撤与图表） ----
  const points: BacktestDayPoint[] = [];
  let peakA = -Infinity;
  let peakB = -Infinity;
  let maxDdA = 0;
  let maxDdB = 0;

  for (const d of eachDay(start, end)) {
    const iso = toISODate(d);
    const price = priceMap.get(iso);
    if (!price) continue;
    const valueA = unitsA * price;
    const valueB = unitsB * price;
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

  const finalPrice = priceMap.get(toISODate(end)) ?? points[points.length - 1]?.price ?? 0;
  const days = points.length;
  const metricsA = computeMetrics(investedA, unitsA, finalPrice, days);
  const metricsB = computeMetrics(investedB, unitsB, finalPrice, days);
  metricsA.maxDrawdownPct = round2(Math.abs(maxDdA) * 100);
  metricsB.maxDrawdownPct = round2(Math.abs(maxDdB) * 100);

  return {
    request: req,
    dataSource,
    generatedAt: new Date().toISOString(),
    days,
    buyCount: schedule.length,
    summary: {
      a: metricsA,
      b: metricsB,
      delta: {
        extraInvested: round2(investedB - investedA),
        extraBtc: round8(unitsB - unitsA),
        returnDeltaPct: round2(metricsB.returnPct - metricsA.returnPct),
        avgCostDeltaPct: round2(metricsA.avgCost - metricsB.avgCost),
      },
    },
    points: downsample(points, 900),
    buyPoints: downsample(buyPoints, 1200),
  };
}
