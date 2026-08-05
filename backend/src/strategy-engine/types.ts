import type { AssetId } from '../types/market';

/** 定投频率 */
export type Frequency = 'daily' | 'weekly' | 'monthly';

/** 指标阈值（全部可配置） */
export interface IndicatorThresholds {
  ma200Multiplier: number; // 价格 <= MA200W * 1.1 触发
  mvrvThreshold: number; // MVRV < 1.0 触发
  mvrvExtreme: number; // MVRV < 0.8 极端
  puellThreshold: number; // Puell < 0.6 触发
  puellExtreme: number; // Puell < 0.5 极端
}

/** 定投策略参数（资金金额由每月投资金额 + 固定比例动态计算） */
export interface StrategyConfig {
  frequency: Frequency;
  feeRatePct: number; // 交易手续费率（%）
}

/** 指标所处区域 */
export type IndicatorZone =
  | 'normal'
  | 'undervalued'
  | 'extreme-undervalued'
  | 'unknown';

/** 单个指标的评估结果 */
export interface IndicatorEvaluation {
  id: string;
  name: string;
  description: string;
  value: number | null;
  zone: IndicatorZone;
  triggered: boolean;
  /** 该指标当前采用的阈值（用于展示） */
  threshold: number | null;
  /** 附加明细（价格、距离等） */
  detail: Record<string, number | string | null>;
  /** 数据来源：live / demo / manual */
  source: string;
}

/** 市场状态（由满足指标数量推导） */
export type MarketState =
  | 'normal'
  | 'slight-undervalued'
  | 'undervalued'
  | 'extreme-undervalued';

/** 策略引擎输出 */
export interface StrategyResult {
  score: number; // 满足指标数量 0..3
  level: 0 | 1 | 2 | 3;
  marketState: MarketState;
  stateLabel: string;
  baseAmount: number;
  extraAmount: number;
  totalAmount: number;
  advice: string;
  nextBuyDate: string;
}

/** 指标引擎输入 */
export interface IndicatorInput {
  asset: AssetId;
  price: number;
  ma200w: number | null;
  mvrv: number | null;
  puell: number | null;
  thresholds: IndicatorThresholds;
  /** 覆盖标记：当用户手动覆盖时传入，用于标注来源 */
  manualOverrides?: { mvrv?: boolean; puell?: boolean };
}
