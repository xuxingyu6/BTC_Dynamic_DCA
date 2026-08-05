import type { IndicatorEvaluation, IndicatorInput } from '../types';

/**
 * 市场周期指标抽象接口。
 * 每个指标独立实现 evaluate()，通过注册表挂载到资产上，
 * 未来扩展 ETH / 黄金 / 纳指时只需新增指标实现并注册。
 */
export interface MarketIndicator {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  evaluate(input: IndicatorInput): IndicatorEvaluation;
}
