/** 日期时间工具（全部基于 UTC，避免时区漂移） */

export const DAY_MS = 86_400_000;

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * 返回所在周（周日为一周结束日）的周日日期。
 * 例如 2026-08-04（周二）→ 2026-08-09（该周日）。
 */
export function weekEndingSunday(d: Date): Date {
  const day = d.getUTCDay(); // 0=周日
  const offset = day === 0 ? 0 : 7 - day;
  return addDays(d, offset);
}

/** 月频定投：加 N 个月，日期超出月份天数时自动收敛到月末 */
export function addMonthsClamped(d: Date, months: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const day = Math.min(d.getUTCDate(), daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** 生成 [start, end] 区间内所有日期（含端点） */
export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const total = diffDays(start, end);
  for (let i = 0; i <= total; i++) out.push(addDays(start, i));
  return out;
}
