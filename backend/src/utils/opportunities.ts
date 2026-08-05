import { toISODate } from './time';

/**
 * 每月加仓机会：默认每周日检测一次三个指标。
 *
 * 返回本月从今天（若今天为周日则包含今天）到月末的所有周日，
 * 用于展示“本月剩余加仓机会”次数与具体日期。
 */
export function remainingSundaysInMonth(now: Date = new Date()): {
  remaining: number;
  dates: string[];
  nextCheck: string | null;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const dates: string[] = [];
  for (let d = today; d <= lastDay; d++) {
    const dt = new Date(Date.UTC(year, month, d));
    if (dt.getUTCDay() === 0) dates.push(toISODate(dt));
  }

  return {
    remaining: dates.length,
    dates,
    nextCheck: dates[0] ?? null,
  };
}
