import type { MarketIndicator } from './Indicator';
import type { IndicatorEvaluation, IndicatorInput } from '../types';

/**
 * 指标 3：Puell Multiple（矿工日收入 / 365 日移动平均）。
 *
 * 规则：
 *   正常：>= 0.6
 *   低估：< 0.6
 *   极端：< 0.5
 */
export const puellIndicator: MarketIndicator = {
  id: 'puell',
  name: 'Puell Multiple',
  description: '矿工收入压力，反映市场抛压水平',

  evaluate(input: IndicatorInput): IndicatorEvaluation {
    const { puell, thresholds } = input;
    const hasData = puell !== null && Number.isFinite(puell);
    const triggered = hasData ? puell! < thresholds.puellThreshold : false;
    const extreme = hasData ? puell! < thresholds.puellExtreme : false;

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      value: puell,
      zone: !hasData
        ? 'unknown'
        : extreme
          ? 'extreme-undervalued'
          : triggered
            ? 'undervalued'
            : 'normal',
      triggered,
      threshold: thresholds.puellThreshold,
      detail: {
        thresholdValue: thresholds.puellThreshold,
        extremeValue: thresholds.puellExtreme,
        rule: `Puell < ${thresholds.puellThreshold} 触发，< ${thresholds.puellExtreme} 极端`,
      },
      source: input.manualOverrides?.puell ? 'manual' : 'live',
    };
  },
};
