/** 跨服务共享的市场数据结构 */

export type AssetId = 'btc' | 'eth' | 'gold' | 'nasdaq';

export type DataSource = 'live' | 'demo' | 'mixed';

/** 单日市场数据（统一结构，来源可以是 CoinMetrics 或演示数据） */
export interface DailyBar {
  date: string; // YYYY-MM-DD
  price: number;
  marketCap?: number;
  realizedCap?: number;
  minerRevenueUsd?: number;
}

/** 当前价格快照 */
export interface MarketSnapshot {
  price: number;
  change24hPct: number;
  ath: number;
  athDate: string | null;
  athDistancePct: number;
  marketCap: number | null;
  marketCapRank: number | null;
  updatedAt: string;
  source: 'coingecko' | 'coinmetrics' | 'demo';
}

/** 预计算的指标时序（key 为 YYYY-MM-DD） */
export interface IndicatorSeries {
  ma200w: Map<string, number>;
  mvrv: Map<string, number>;
  puell: Map<string, number>;
}

/** 历史图表数据点 */
export interface HistoryPoint {
  date: string;
  price: number;
  ma200w: number | null;
}
