import { round2 } from '../../utils/numbers';
import {
  CORE_DAILY_DIVISOR,
  CORE_RATIO,
  RESERVE_RATIO,
} from './fixedRules';
import type { CapitalAllocationConfig } from './types';

/**
 * CapitalAllocationEngine（资金分配引擎）
 *
 * 将每月投资金额按固定比例自动拆分：
 *   - 长期底仓定投（40%）：按日自动买入，保证长期不踏空
 *   - 加速资金（60%）：等待低估机会分批释放
 *
 * 示例：每月投资 $1000
 *   长期底仓  $400/月 → 每日 $13.33（400 ÷ 30，固定除数）
 *   加速资金  $600/月 → 留存为战略资金
 *
 * 核心比例与每日除数均为固定策略参数，用户不可修改。
 */

export interface CapitalAllocationResult {
  /** 每月投资金额（USD，用户自定义） */
  monthlyInvestmentAmount: number;
  /** 底仓资金比例（固定 0.4） */
  coreRatio: number;
  /** 加速资金比例（固定 0.6） */
  reserveRatio: number;
  /** 长期底仓月度额度 */
  coreMonthly: number;
  /** 加速资金月度额度 */
  reserveMonthly: number;
  /** 长期底仓每日买入金额（底仓月额度 ÷ 30） */
  coreDaily: number;
  /** 每日拆分除数（固定 30） */
  daysPerMonth: number;
}

export function allocateMonthlyBudget(
  config: CapitalAllocationConfig,
  _now: Date = new Date()
): CapitalAllocationResult {
  const monthly = config.monthlyInvestmentAmount;
  const coreMonthly = round2(monthly * CORE_RATIO);
  const reserveMonthly = round2(monthly * RESERVE_RATIO);
  const coreDaily = round2(coreMonthly / CORE_DAILY_DIVISOR);

  return {
    monthlyInvestmentAmount: monthly,
    coreRatio: CORE_RATIO,
    reserveRatio: RESERVE_RATIO,
    coreMonthly,
    reserveMonthly,
    coreDaily,
    daysPerMonth: CORE_DAILY_DIVISOR,
  };
}

export function currentMonthISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}
