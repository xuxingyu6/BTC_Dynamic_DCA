/** 数字与日期格式化工具 */

export function fmtUsd(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '--';
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  );
}

/** 紧凑金额：$1.23M / $850K */
export function fmtCompactUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '--';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
}

export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtPct(n: number | null | undefined, digits = 1, sign = true): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '--';
  const s = sign && n > 0 ? '+' : '';
  return `${s}${n.toFixed(digits)}%`;
}

export function fmtQty(n: number | null | undefined, digits = 6): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--';
  return iso.slice(0, 10);
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function fmtDateCN(iso: string | null | undefined): string {
  if (!iso) return '--';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${y}-${m}-${d}`;
}

/** 市场状态对应的中文标签与颜色 */
export const STATE_META: Record<
  string,
  { label: string; color: string; dot: string; emoji: string }
> = {
  normal: { label: '正常区间', color: 'text-muted', dot: 'bg-muted', emoji: '⚪' },
  'slight-undervalued': { label: '轻度低估', color: 'text-accent', dot: 'bg-accent', emoji: '🔵' },
  undervalued: { label: '明显低估', color: 'text-warn', dot: 'bg-warn', emoji: '🟡' },
  'extreme-undervalued': { label: '极端低估', color: 'text-up', dot: 'bg-up', emoji: '🟢' },
  unknown: { label: '数据不足', color: 'text-muted', dot: 'bg-muted', emoji: '—' },
};

export const FREQUENCY_LABEL: Record<string, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};
