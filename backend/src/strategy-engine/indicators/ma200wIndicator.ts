import type { MarketIndicator } from './Indicator';
import type { IndicatorEvaluation, IndicatorInput } from '../types';

/**
 * 指标 1：BTC 价格 vs 200 周移动平均线。
 *
 * 触发条件：价格 <= MA200W x 阈值（默认 1.1）
 * 用途：判断价格是否接近长期周期底部。
 */
export const ma200wIndicator: MarketIndicator = {
  id: 'ma200w',
  name: '200 周移动平均线',
  description: '价格接近 200 周均线，说明处于长期价值区域',

  evaluate(input: IndicatorInput): IndicatorEvaluation {
    const { price, ma200w, thresholds } = input;
    const hasData = price > 0 && ma200w !== null && ma200w > 0;
    const thresholdPrice = hasData ? ma200w! * thresholds.ma200Multiplier : null;
    const triggered = hasData ? price <= thresholdPrice! : false;
    const distancePct = hasData ? (price / ma200w! - 1) * 100 : null;

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      value: ma200w,
      zone: !hasData ? 'unknown' : triggered ? 'undervalued' : 'normal',
      triggered,
      threshold: thresholds.ma200Multiplier,
      detail: {
        price,
        ma200w: ma200w ?? null,
        thresholdPrice,
        distancePct: distancePct === null ? null : Math.round(distancePct * 10) / 10,
        rule: `价格 ≤ MA200W × ${thresholds.ma200Multiplier}`,
      },
      source: 'live',
    };
  },
};
