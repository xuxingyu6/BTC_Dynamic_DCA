import { config } from '../../config';
import type { DailyBar } from '../../types/market';
import { estimateDailyMinerRevenueUsd } from '../../utils/btc';

/**
 * CoinMetrics Community API（免费、无需 Key）。
 * 提供 BTC 自 2013 年以来的每日：
 *   - PriceUSD          价格
 *   - CapMrktCurUSD     流通市值
 *   - IssTotUSD         矿工每日发行收入（用于 Puell，真实数据）
 *
 * 说明：CapRealUSD / RevUSD 在免费层返回 403（已移至付费层），
 * MVRV 因此默认使用模型估算（UI 标注「估算」）；配置 Bitbo API Key 后
 * 可覆盖为 Bitbo 真实 MVRV。
 */

const TIMEOUT_MS = 25_000;
const METRICS = 'PriceUSD,CapMrktCurUSD,IssTotUSD';
const START_TIME = '2013-12-01';
const MAX_PAGES = 6;

interface CmRow {
  time: string;
  PriceUSD?: string;
  CapMrktCurUSD?: string;
  IssTotUSD?: string;
}

interface CmResponse {
  data?: CmRow[];
  next_page_url?: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`CoinMetrics HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function toNumber(v: string | undefined): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toBar(row: CmRow): DailyBar | null {
  const price = toNumber(row.PriceUSD);
  if (!price) return null;
  const date = row.time.slice(0, 10);
  const bar: DailyBar = { date, price };
  const marketCap = toNumber(row.CapMrktCurUSD);
  if (marketCap) bar.marketCap = marketCap;

  // 矿工收入优先使用 CoinMetrics IssTotUSD（真实数据），缺失时用确定性区块奖励估算
  const issTot = toNumber(row.IssTotUSD);
  bar.minerRevenueUsd =
    issTot ?? estimateDailyMinerRevenueUsd(price, new Date(`${date}T00:00:00.000Z`));
  return bar;
}

/** 拉取完整每日历史（升序） */
export async function fetchBtcDailyHistory(): Promise<DailyBar[]> {
  const firstUrl = `${config.coinmetricsUrl}/timeseries/asset-metrics?assets=btc&metrics=${METRICS}&frequency=1d&page_size=10000&start_time=${START_TIME}`;
  const rows: CmRow[] = [];
  let url: string | null = firstUrl;

  for (let page = 0; page < MAX_PAGES && url; page++) {
    const json: CmResponse = await fetchJson<CmResponse>(url);
    const data = json.data ?? [];
    if (data.length > 0) rows.push(...data);
    url = json.next_page_url ?? null;
  }

  if (rows.length === 0) throw new Error('CoinMetrics 未返回数据');

  rows.sort((a, b) => a.time.localeCompare(b.time));
  const bars = rows.map(toBar).filter((b): b is DailyBar => b !== null);
  if (bars.length === 0) throw new Error('CoinMetrics 数据无法解析');
  return bars;
}
