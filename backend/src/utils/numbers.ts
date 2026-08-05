/** 数值工具 */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function round8(n: number): number {
  return Math.round(n * 100_000_000) / 100_000_000;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 安全除法，除数为 0 / 非有限值时返回 fallback */
export function safeDiv(a: number, b: number, fallback: number | null = null): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return fallback;
  return a / b;
}

/** 安全的百分比：a 相对 b 的变化百分比 */
export function pctChange(a: number, b: number, fallback: number | null = null): number | null {
  const ratio = safeDiv(a, b, null);
  if (ratio === null) return fallback;
  return (ratio - 1) * 100;
}

/** 简易乘法取整，避免浮点误差展示 */
export function money(n: number): number {
  return Math.round(n * 100) / 100;
}
