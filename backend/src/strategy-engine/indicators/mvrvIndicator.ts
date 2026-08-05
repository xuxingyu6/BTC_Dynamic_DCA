import type { MarketIndicator } from './Indicator';
import type { IndicatorEvaluation, IndicatorInput } from '../types';

/**
 * 指标 2：MVRV Ratio（市值 / 已实现市值）。
 *
 * 规则：
 *   正常：MVRV >= 1
 *   低估：MVRV < 1
 *   极端低估：MVRV < 0.8
 */
export const mvrvIndicator: MarketIndicator = {
  id: 'mvrv',
  name: 'MVRV Ratio',
  description: '市场价格相对链上平均成本的位置',

  evaluate(input: IndicatorInput): IndicatorEvaluation {
    const { mvrv, thresholds } = input;
    const hasData = mvrv !== null && Number.isFinite(mvrv);
    const triggered = hasData ? mvrv! < thresholds.mvrvThreshold : false;
    const extreme = hasData ? mvrv! < thresholds.mvrvExtreme : false;

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      value: mvrv,
      zone: !hasData
        ? 'unknown'
        : extreme
          ? 'extreme-undervalued'
          : triggered
            ? 'undervalued'
            : 'normal',
      triggered,
      threshold: thresholds.mvrvThreshold,
      detail: {
        thresholdValue: thresholds.mvrvThreshold,
        extremeValue: thresholds.mvrvExtreme,
        rule: `MVRV < ${thresholds.mvrvThreshold} 触发，< ${thresholds.mvrvExtreme} 极端`,
      },
      source: input.manualOverrides?.mvrv ? 'manual' : 'live',
    };
  },
};
