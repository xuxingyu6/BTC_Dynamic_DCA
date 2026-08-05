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
  /** 每月投入预算（两种策略共用同一总预算） */
  monthlyInvestmentAmount: number;
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
  /** 资金公平校验：两个策略投入本金必须一致 */
  fairness: {
    fair: boolean;
    investedA: number;
    investedB: number;
    diff: number;
    totalBudget: number;
    months: number;
  };
  summary: {
    a: StrategyMetrics;
    b: StrategyMetrics;
    delta: {
      extraBtc: number;
      /** BTC 数量提升比例：动态相对普通 */
      btcGainPct: number;
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
  /** 每月投资金额（USD）——唯一由用户自定义的资金参数 */
  monthlyInvestmentAmount: number;
}

export interface AccelerationRulesConfig {
  level1Pct: number;
  level2Pct: number;
  level3Pct: number;
  monthlyMaxDeploymentPct: number;
}

export interface AppSettings {
  strategy: StrategyConfig;
  indicators: IndicatorThresholds;
  capital: CapitalAllocationConfig;
  acceleration: AccelerationRulesConfig;
  portfolio: {
    /** 持仓来源模式：manual = 手动录入（当前）；records = 交易记录自动计算（预留） */
    mode: 'manual' | 'records';
    btcAmount: number;
    /** 平均持仓成本（USD/BTC） */
    avgCost: number;
  };
  data: {
    providerMode: 'auto' | 'demo';
    manualOverride: { mvrv: number | null; puell: number | null };
  };
  ui: { refreshIntervalSec: number };
}

export type RiskLevel = 0 | 1 | 2 | 3;
export type ReserveStatusType = 'available' | 'partial' | 'exhausted';

export interface CapitalAllocationResult {
  monthlyInvestmentAmount: number;
  coreRatio: number;
  reserveRatio: number;
  coreMonthly: number;
  reserveMonthly: number;
  coreDaily: number;
  daysPerMonth: number;
}

export interface OpportunitiesInfo {
  /** 本月剩余加仓机会（周日）次数 */
  remaining: number;
  /** 剩余周日日期列表（YYYY-MM-DD） */
  dates: string[];
  /** 最近一次检测日期 */
  nextCheck: string | null;
}

export interface ReserveStatus {
  month: string;
  /** 当前加速资金余额（累计余额） */
  balance: number;
  /** 历史剩余 */
  carryover: number;
  /** 本月新增加速资金 */
  monthlyAdded: number;
  /** 历史累计已使用 */
  used: number;
  /** 本月已执行加速买入 */
  deployedThisMonth: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  monthlyDeploymentPct: number;
  status: ReserveStatusType;
  level: RiskLevel;
  deployPct: number;
  deploySuggestion: number;
  opportunities: OpportunitiesInfo;
  triggered: number;
  price: number;
  allocation: CapitalAllocationResult;
  rules: AccelerationRulesConfig;
}

/** BTC 持仓统计（用户输入 + 自动计算） */
export interface PortfolioStatus {
  mode: 'manual' | 'records';
  btcAmount: number;
  /** 平均持仓成本（USD/BTC） */
  avgCost: number;
  price: number;
  /** 持仓本金 = BTC 数量 × 平均成本 */
  principal: number;
  /** 当前持仓价值 = BTC 数量 × 当前价格 */
  currentValue: number;
  /** 浮动盈亏 = 当前价值 − 持仓本金 */
  pnl: number;
  /** 收益率 = (当前价格 − 平均成本) ÷ 平均成本 */
  pnlPct: number;
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

/** 策略核心固定参数（与后端 fixedRules.ts 保持一致，仅供展示/默认值使用） */
export const CAPITAL_RULES = {
  coreRatio: 0.4,
  reserveRatio: 0.6,
  level1Release: 0.1,
  level2Release: 0.3,
  level3Release: 0.6,
  monthlyMaxDeploymentPct: 100,
  coreDailyDivisor: 30,
} as const;
