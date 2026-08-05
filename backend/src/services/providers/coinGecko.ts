import { config } from '../../config';

/**
 * CoinGecko 免费 API（无需 Key）。
 * 仅用于「当前价格 / 24h 涨跌 / ATH / 市值」快照；
 * 历史长序列由 CoinMetrics 提供。
 */

const TIMEOUT_MS = 15_000;

async function fetchJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.coingeckoUrl}${path}`, {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface CoinGeckoCoinResponse {
  market_data?: {
    current_price?: Record<string, number>;
    price_change_percentage_24h?: number;
    ath?: Record<string, number>;
    ath_date?: Record<string, string>;
    market_cap?: Record<string, number>;
    market_cap_rank?: number;
  };
}

export interface BtcSnapshot {
  price: number;
  change24hPct: number;
  ath: number;
  athDate: string | null;
  marketCap: number;
  marketCapRank: number | null;
}

export async function fetchBtcSnapshot(): Promise<BtcSnapshot> {
  const data = await fetchJson<CoinGeckoCoinResponse>(
    '/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false'
  );
  const md = data.market_data ?? {};
  const price = md.current_price?.usd;
  const ath = md.ath?.usd;
  if (typeof price !== 'number' || !Number.isFinite(price)) {
    throw new Error('CoinGecko 返回数据缺少 current_price.usd');
  }
  return {
    price,
    change24hPct: Number.isFinite(md.price_change_percentage_24h)
      ? (md.price_change_percentage_24h as number)
      : 0,
    ath: typeof ath === 'number' && Number.isFinite(ath) ? ath : price,
    athDate: md.ath_date?.usd ? md.ath_date.usd.slice(0, 10) : null,
    marketCap: md.market_cap?.usd ?? 0,
    marketCapRank: md.market_cap_rank ?? null,
  };
}
