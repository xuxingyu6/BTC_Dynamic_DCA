/** 与后端共享的类型定义 */

export type Frequency = 'daily' | 'weekly' | 'monthly';
export type IndicatorZone = 'normal' | 'undervalued' | 'extreme-undervalued' | 'unknown';
export type MarketState = 'normal' | 'slight-undervalued' | 'undervalued' | 'extreme-undervalued';
export type DataSource = 'live' | 'demo' | 'mixed';

export interface IndicatorDetail {
  [key: string]: number | string | null;
}

export interface IndicatorEvaluation {
  id: 'ma200w' | 'mvrv' | 'puell' | string;
  name: string;
  description: string;
  value: number | null;
  zone: IndicatorZone;
  triggered: boolean;
  threshold: number | null;
  detail: IndicatorDetail;
  source: string;
  updatedAt?: string;
  series?: Array<{ date: string; value: number }>;
}

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

export interface StrategyResult {
  score: number;
  level: 0 | 1 | 2 | 3;
  marketState: MarketState;
  stateLabel: string;
  baseAmount: number;
  extraAmount: number;
  totalAmount: number;
  advice: string;
  nextBuyDate: string;
}

export interface IndicatorThresholds {
  ma200Multiplier: number;
  mvrvThreshold: number;
  mvrvExtreme: number;
  puellThreshold: number;
  puellExtreme: number;
}

export interface StrategyConfig {
  baseAmount: number;
  level1Amount: number;
  level2Amount: number;
  level3Amount: number;
  frequency: Frequency;
  feeRatePct: number;
}

export interface IndicatorsResponse {
  asset: 'btc';
  updatedAt: string;
  source: DataSource;
  market: MarketSnapshot;
  indicators: IndicatorEvaluation[];
  strategy: StrategyResult;
  thresholds: IndicatorThresholds;
  strategyConfig: StrategyConfig;
}

export interface HistoryResponse {
  source: DataSource;
  points: Array<{ date: string; price: number; ma200w: number | null }>;
}

export interface BacktestRequest {
  startDate: string;
  endDate: string;
  frequency: Frequency;
  baseAmount: number;
  level1Amount: number;
  level2Amount: number;
  level3Amount: number;
  ma200Multiplier: number;
  mvrvThreshold: number;
  puellThreshold: number;
  feeRatePct: number;
}

export interface StrategyMetrics {
  totalInvested: number;
  btcAccumulated: number;
  avgCost: number;
  currentValue: number;
  returnPct: number;
  cagrPct: number | null;
  maxDrawdownPct: number;
}

export interface BacktestDayPoint {
  date: string;
  price: number;
  ma200w: number | null;
  portfolioA: number;
  portfolioB: number;
  investedA: number;
  investedB: number;
}

export interface BuyPoint {
  date: string;
  price: number;
  amount: number;
  strategy: 'A' | 'B';
  level: number;
}

export interface BacktestResponse {
  request: BacktestRequest;
  dataSource: string;
  generatedAt: string;
  days: number;
  buyCount: number;
  summary: {
    a: StrategyMetrics;
    b: StrategyMetrics;
    delta: {
      extraInvested: number;
      extraBtc: number;
      returnDeltaPct: number;
      avgCostDeltaPct: number;
    };
  };
  points: BacktestDayPoint[];
  buyPoints: BuyPoint[];
}

export interface InvestmentRecord {
  id: string;
  date: string;
  price: number;
  amount: number;
  quantity: number;
  marketState: string;
  transactionType: string;
  riskLevel: number | null;
  triggeredIndicators: number | null;
  remainingReserve: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 投资记录录入（与后端 API 对齐） */
export interface RecordInput {
  date: string;
  price?: number | null;
  amount: number;
  marketState?: string | null;
  transactionType?: string | null;
  riskLevel?: number | null;
  triggeredIndicators?: number | null;
  remainingReserve?: number | null;
  note?: string | null;
}

export interface CapitalAllocationConfig {
  monthlyBudget: number;
  corePercentage: number;
  reservePercentage: number;
}

export interface AccelerationRulesConfig {
  level1Pct: number;
  level2Pct: number;
  level3Pct: number;
  monthlyMaxDeploymentPct: number;
  initialReserve: number | null;
}

export interface AppSettings {
  strategy: StrategyConfig;
  indicators: IndicatorThresholds;
  capital: CapitalAllocationConfig;
  acceleration: AccelerationRulesConfig;
  data: {
    providerMode: 'auto' | 'demo';
    manualOverride: { mvrv: number | null; puell: number | null };
  };
  ui: { refreshIntervalSec: number };
}

export type RiskLevel = 0 | 1 | 2 | 3;
export type ReserveStatusType = 'available' | 'partial' | 'exhausted';

export interface CapitalAllocationResult {
  monthlyBudget: number;
  corePercentage: number;
  reservePercentage: number;
  coreMonthly: number;
  reserveMonthly: number;
  coreDaily: number;
  daysInMonth: number;
}

export interface ReserveStatus {
  month: string;
  initialReserve: number;
  used: number;
  remaining: number;
  monthlyLimit: number;
  deployedThisMonth: number;
  monthlyRemaining: number;
  monthlyDeploymentPct: number;
  status: ReserveStatusType;
  level: RiskLevel;
  deployPct: number;
  deploySuggestion: number;
  triggered: number;
  price: number;
  allocation: CapitalAllocationResult;
  rules: AccelerationRulesConfig;
}

export interface ReserveDeployResult {
  result: {
    deployed: boolean;
    status: string;
    level: RiskLevel;
    requestedAmount: number;
    actualAmount: number;
    remaining: number;
    monthlyRemaining: number;
  };
  record: InvestmentRecord | null;
  level: RiskLevel;
  triggered: number;
  price: number;
}
