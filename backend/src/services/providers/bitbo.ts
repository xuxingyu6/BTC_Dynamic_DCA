import { config } from '../../config';

/**
 * Bitbo API 客户端（可选数据源）。
 *
 * Bitbo 提供 MVRV / Puell Multiple / 200W MA 等 BTC 周期指标的权威数据。
 * 官方文档：https://bitbo.io/api/docs/
 * 注意：需要 Bitbo Pro++ 账户的 API Key（charts.bitbo.io/profile/api/）。
 * 在 .env 中配置 BITBO_API_KEY 后自动启用，否则回退到模型估算。
 *
 * 响应格式统一为：{ "data": [ [date, value, ...], ... ] }
 */

const TIMEOUT_MS = 25_000;

async function fetchRows(endpoint: string, startDate: string, endDate: string): Promise<string[][]> {
  if (!config.bitboApiKey) throw new Error('未配置 BITBO_API_KEY');
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    api_key: config.bitboApiKey,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.bitboUrl}/${endpoint}/?${params.toString()}`, {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Bitbo ${endpoint} HTTP ${res.status}`);
    const json = (await res.json()) as { data?: unknown };
    const rows = Array.isArray(json.data) ? (json.data as string[][]) : [];
    if (rows.length === 0) throw new Error(`Bitbo ${endpoint} 无数据`);
    return rows;
  } finally {
    clearTimeout(timer);
  }
}

function toNumberSafe(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** MVRV：{ date, value }[]（Bitbo /api/v1/mvrv/） */
export async function fetchMvrvSeries(startDate: string, endDate: string): Promise<Array<{ date: string; value: number }>> {
  const rows = await fetchRows('mvrv', startDate, endDate);
  return rows
    .map((r) => ({ date: String(r[0] ?? '').slice(0, 10), value: toNumberSafe(r[1]) }))
    .filter((p) => p.date && p.value !== null) as Array<{ date: string; value: number }>;
}

/** Puell Multiple：{ date, value }[]（Bitbo /api/v1/puell-multiple/） */
export async function fetchPuellSeries(startDate: string, endDate: string): Promise<Array<{ date: string; value: number }>> {
  const rows = await fetchRows('puell-multiple', startDate, endDate);
  return rows
    .map((r) => ({ date: String(r[0] ?? '').slice(0, 10), value: toNumberSafe(r[1]) }))
    .filter((p) => p.date && p.value !== null) as Array<{ date: string; value: number }>;
}

/** 200W MA：{ date, value }[]（Bitbo /api/v1/200-week-ma/） */
export async function fetchMa200wSeries(startDate: string, endDate: string): Promise<Array<{ date: string; value: number }>> {
  const rows = await fetchRows('200-week-ma', startDate, endDate);
  return rows
    .map((r) => ({ date: String(r[0] ?? '').slice(0, 10), value: toNumberSafe(r[1]) }))
    .filter((p) => p.date && p.value !== null) as Array<{ date: string; value: number }>;
}
