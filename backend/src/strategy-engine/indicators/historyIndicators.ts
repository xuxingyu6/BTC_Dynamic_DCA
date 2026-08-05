import type { DailyBar, IndicatorSeries } from '../../types/market';
import { weekEndingSunday, parseISODate, toISODate } from '../../utils/time';

/**
 * 从历史日线预计算指标时序：
 *   - MA200W：按「周结束日」聚合周收盘价，取最近 200 周均值
 *             （仅使用已完成周，避免未来函数）
 *   - MVRV：优先使用链上已实现市值；缺失时用「长期 EMA 价格」作为
 *           已实现价格代理估算（在 UI 中标注为估算）
 *   - Puell：矿工日收入 / 前 365 日收入均值（前缀和优化）
 */

/** 已实现价格估算使用的 EMA 跨度（天） */
const REALIZED_EMA_SPAN = 1200;

export function buildIndicatorSeries(bars: DailyBar[]): IndicatorSeries {
  const ma200w = new Map<string, number>();
  const mvrv = new Map<string, number>();
  const puell = new Map<string, number>();

  if (bars.length === 0) return { ma200w, mvrv, puell };

  // ---- 1. MA200W ----
  // 周结束日 -> 该周最后一个收盘价
  const weeklyCloses: Array<{ weekEnd: string; close: number }> = [];
  for (const bar of bars) {
    const weekEnd = toISODate(weekEndingSunday(parseISODate(bar.date)));
    const last = weeklyCloses[weeklyCloses.length - 1];
    if (last && last.weekEnd === weekEnd) last.close = bar.price;
    else weeklyCloses.push({ weekEnd, close: bar.price });
  }

  let wk = 0; // 指向首个 weekEnd < 当前日期的周
  const weekCount = weeklyCloses.length;
  for (const bar of bars) {
    while (wk < weekCount && weeklyCloses[wk].weekEnd < bar.date) wk++;
    if (wk >= 200) {
      let sum = 0;
      for (let i = wk - 200; i < wk; i++) sum += weeklyCloses[i].close;
      ma200w.set(bar.date, sum / 200);
    }
  }

  // ---- 2. MVRV（链上优先，缺失时用 EMA 价格估算） ----
  // 先计算 EMA 已实现价格序列
  const alpha = 2 / (REALIZED_EMA_SPAN + 1);
  const realizedPrice: number[] = [];
  let ema = bars[0].price;
  for (const bar of bars) {
    ema = bar.price * alpha + ema * (1 - alpha);
    realizedPrice.push(ema);
  }
  for (const bar of bars) {
    if (bar.marketCap && bar.realizedCap && bar.realizedCap > 0) {
      mvrv.set(bar.date, bar.marketCap / bar.realizedCap);
    }
  }
  // 估算回填：仅当该日期没有链上 MVRV 时使用
  for (let i = 0; i < bars.length; i++) {
    if (mvrv.has(bars[i].date)) continue;
    if (realizedPrice[i] > 0) {
      mvrv.set(bars[i].date, bars[i].price / realizedPrice[i]);
    }
  }

  // ---- 3. Puell（前缀和）----
  const revPrefix = new Array<number>(bars.length + 1).fill(0);
  for (let i = 0; i < bars.length; i++) {
    revPrefix[i + 1] = revPrefix[i] + (bars[i].minerRevenueUsd ?? 0);
  }
  const WINDOW = 365;
  for (let i = 0; i < bars.length; i++) {
    const start = Math.max(0, i - WINDOW + 1);
    const avg = (revPrefix[i + 1] - revPrefix[start]) / (i + 1 - start);
    const rev = bars[i].minerRevenueUsd;
    if (rev !== undefined && rev > 0 && avg > 0 && i - start >= 200) {
      puell.set(bars[i].date, rev / avg);
    }
  }

  return { ma200w, mvrv, puell };
}
