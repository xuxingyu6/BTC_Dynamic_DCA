import type {
  IndicatorEvaluation,
  StrategyConfig,
  StrategyResult,
} from './types';
import { addDays, addMonthsClamped, toISODate } from '../utils/time';

/**
 * 策略引擎：根据指标触发数量计算本次投资金额。
 *
 * 规则：
 *   0 个指标满足 -> 基础定投金额
 *   1 个指标满足 -> 基础 + Level1
 *   2 个指标满足 -> 基础 + Level2
 *   3 个指标满足 -> 基础 + Level3
 */

const STATE_LABELS: Record<StrategyResult['marketState'], string> = {
  normal: '正常区间',
  'slight-undervalued': '轻度低估',
  undervalued: '明显低估',
  'extreme-undervalued': '极端低估',
};

const ADVICE: Record<StrategyResult['marketState'], string> = {
  normal: '市场处于正常区间，维持基础定投节奏',
  'slight-undervalued': '出现低估信号，建议小幅加仓',
  undervalued: '低估信号明显，建议增加买入',
  'extreme-undervalued': '极端低估区域，建议大幅加仓',
};

export function nextBuyDateISO(frequency: StrategyConfig['frequency']): string {
  const today = new Date();
  const next =
    frequency === 'daily'
      ? addDays(today, 1)
      : frequency === 'weekly'
        ? addDays(today, 7)
        : addMonthsClamped(today, 1);
  return toISODate(next);
}

export function evaluateStrategy(
  indicators: IndicatorEvaluation[],
  config: StrategyConfig
): StrategyResult {
  const triggered = indicators.filter((i) => i.triggered);
  const score = triggered.length;
  const level = (Math.min(3, Math.max(0, score)) as 0 | 1 | 2 | 3);

  const extraAmount =
    level === 0
      ? 0
      : level === 1
        ? config.level1Amount
        : level === 2
          ? config.level2Amount
          : config.level3Amount;

  const marketState: StrategyResult['marketState'] =
    level === 3
      ? 'extreme-undervalued'
      : level === 2
        ? 'undervalued'
        : level === 1
          ? 'slight-undervalued'
          : 'normal';

  return {
    score,
    level,
    marketState,
    stateLabel: STATE_LABELS[marketState],
    baseAmount: config.baseAmount,
    extraAmount,
    totalAmount: Math.round((config.baseAmount + extraAmount) * 100) / 100,
    advice: ADVICE[marketState],
    nextBuyDate: nextBuyDateISO(config.frequency),
  };
}
