/** BTC 链上参数估算（用于 Puell 等指标的兜底计算） */

const HALVING_DATES: Array<{ date: Date; reward: number }> = [
  { date: new Date('2012-11-28T00:00:00.000Z'), reward: 25 },
  { date: new Date('2016-07-09T00:00:00.000Z'), reward: 12.5 },
  { date: new Date('2020-05-11T00:00:00.000Z'), reward: 6.25 },
  { date: new Date('2024-04-20T00:00:00.000Z'), reward: 3.125 },
  { date: new Date('2028-04-01T00:00:00.000Z'), reward: 1.5625 },
];

/** 按日期返回减半后的区块奖励（BTC/区块） */
export function blockRewardAt(date: Date): number {
  let reward = 50;
  for (const h of HALVING_DATES) {
    if (date >= h.date) reward = h.reward;
    else break;
  }
  return reward;
}

/** 每日平均出块数（按 10 分钟目标块时间近似） */
export const BLOCKS_PER_DAY = 144;

/** 估算矿工每日收入（USD）：区块奖励 * 出块数 * 价格 */
export function estimateDailyMinerRevenueUsd(price: number, date: Date): number {
  return BLOCKS_PER_DAY * blockRewardAt(date) * price;
}

/** 估算流通量（百万枚，粗粒度线性近似，仅用于演示数据） */
export function approxCirculatingSupply(date: Date): number {
  const start = new Date('2014-01-01T00:00:00.000Z');
  const years = Math.max(0, (date.getTime() - start.getTime()) / (365.25 * 86_400_000));
  // 2014 年初约 12.3M，2026 年中约 19.8M
  return 12.3 + years * 0.6;
}
