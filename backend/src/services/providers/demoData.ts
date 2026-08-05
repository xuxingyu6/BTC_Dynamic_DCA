import type { DailyBar } from '../../types/market';
import {
  approxCirculatingSupply,
  BLOCKS_PER_DAY,
  blockRewardAt,
} from '../../utils/btc';
import { addDays, diffDays, parseISODate, toISODate, todayISO } from '../../utils/time';

/**
 * 演示数据生成器（离线可用 / 数据源故障时兜底）。
 *
 * 基于关键历史锚点（真实 BTC 走势）做对数空间平滑插值，
 * 再叠加确定性噪声；市值、已实现市值、矿工收入由模型推算。
 * 数据仅用于功能演示，来源会明确标记为 demo。
 */

/** [日期, 价格] 历史锚点 */
const ANCHORS: Array<[string, number]> = [
  ['2014-01-01', 750],
  ['2015-01-01', 315],
  ['2016-01-01', 430],
  ['2017-01-01', 960],
  ['2017-12-17', 19500],
  ['2018-12-15', 3200],
  ['2019-06-26', 12800],
  ['2020-03-13', 3850],
  ['2021-04-14', 64000],
  ['2021-11-08', 69000],
  ['2022-11-21', 15500],
  ['2023-10-01', 27000],
  ['2024-03-14', 73500],
  ['2024-08-05', 49000],
  ['2025-01-20', 109000],
  ['2025-07-01', 116000],
  ['2025-12-20', 126000],
  ['2026-03-01', 121000],
];

/** 确定性 PRNG（mulberry32），保证演示数据可复现 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function generateDemoBars(): DailyBar[] {
  const start = parseISODate('2014-01-01');
  const end = parseISODate(todayISO());
  const days = diffDays(start, end);
  const rng = mulberry32(20_260_804);
  const bars: DailyBar[] = [];

  // 锚点按日期排序
  const anchors = [...ANCHORS, [todayISO(), 118000] as [string, number]].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  let anchorIdx = 0;
  for (let i = 0; i <= days; i++) {
    const date = addDays(start, i);
    const iso = toISODate(date);

    while (anchorIdx + 1 < anchors.length && parseISODate(anchors[anchorIdx + 1][0]) <= date) {
      anchorIdx++;
    }
    const [aDate, aPrice] = anchors[anchorIdx];
    const [bDate, bPrice] = anchors[Math.min(anchorIdx + 1, anchors.length - 1)];
    const segLen = Math.max(1, diffDays(parseISODate(aDate), parseISODate(bDate)));
    const t = clamp01(diffDays(parseISODate(aDate), date) / segLen);
    const eased = smoothstep(t);

    const logPrice =
      Math.log(aPrice) + (Math.log(bPrice) - Math.log(aPrice)) * eased;
    const noise = (rng() - 0.5) * 0.024; // ±1.2% 日噪声
    const price = Math.exp(logPrice + noise);

    // 已实现市值占比随周期摆动：熊市底部接近 1（MVRV<1），牛市顶部约 0.45
    const phase = (2 * Math.PI * i) / 1530; // ~4.2 年周期
    const rcRatio = 0.45 + 0.55 * ((Math.cos(phase - 1.15) + 1) / 2) + (rng() - 0.5) * 0.055;

    const marketCap = price * approxCirculatingSupply(date) * 1_000_000;
    const bar: DailyBar = {
      date: iso,
      price,
      marketCap,
      realizedCap: marketCap * rcRatio,
      minerRevenueUsd:
        BLOCKS_PER_DAY * blockRewardAt(date) * price * (0.9 + rng() * 0.2),
    };
    bars.push(bar);
  }
  return bars;
}
