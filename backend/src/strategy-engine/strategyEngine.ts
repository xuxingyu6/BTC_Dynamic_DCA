import type {
  IndicatorEvaluation,
  StrategyConfig,
  StrategyResult,
} from './types';
import type { CapitalAllocationResult } from './acceleration/capitalAllocationEngine';
import {
  LEVEL1_RELEASE,
  LEVEL2_RELEASE,
  LEVEL3_RELEASE,
} from './acceleration/fixedRules';
import { round2 } from '../utils/numbers';
import { addDays, addMonthsClamped, toISODate } from '../utils/time';

/**
 * 策略引擎：根据指标触发数量计算本次投资金额。
 *
 * 规则（金额均由每月投资金额动态计算，固定比例）：
 *   0 个指标满足 → 长期底仓每日买入（底仓月额度 ÷ 30）
 *   1 个指标满足 → 每日底仓 + 加速资金 × 10%（轻度机会）
 *   2 个指标满足 → 每日底仓 + 加速资金 × 30%（明显机会）
 *   3 个指标满足 → 每日底仓 + 加速资金 × 60%（极端机会）
 */

const STATE_LABELS: Record<StrategyResult['marketState'], string> = {
  normal: '正常区域',
  'slight-undervalued': '轻度低估',
  undervalued: '明显低估',
  'extreme-undervalued': '极端低估',
};

const ADVICE: Record<StrategyResult['marketState'], string> = {
  normal: '市场处于正常区域，维持每日底仓定投节奏',
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

/** 根据机会等级返回加速资金释放比例 */
function releaseRatio(level: number): number {
  switch (level) {
    case 1:
      return LEVEL1_RELEASE;
    case 2:
      return LEVEL2_RELEASE;
    case 3:
      return LEVEL3_RELEASE;
    default:
      return 0;
  }
}

export function evaluateStrategy(
  indicators: IndicatorEvaluation[],
  config: StrategyConfig,
  allocation: CapitalAllocationResult
): StrategyResult {
  const triggered = indicators.filter((i) => i.triggered);
  const score = triggered.length;
  const level = Math.min(3, Math.max(0, score)) as 0 | 1 | 2 | 3;

  const baseAmount = allocation.coreDaily; // 长期底仓每日买入
  const extraAmount = round2(allocation.reserveMonthly * releaseRatio(level));
  const totalAmount = round2(baseAmount + extraAmount);

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
    baseAmount,
    extraAmount,
    totalAmount,
    advice: ADVICE[marketState],
    nextBuyDate: nextBuyDateISO(config.frequency),
  };
}
