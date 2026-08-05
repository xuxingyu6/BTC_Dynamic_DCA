import { daysInMonth } from '../../utils/time';
import { round2 } from '../../utils/numbers';
import type { CapitalAllocationConfig } from './types';

/**
 * CapitalAllocationEngine
 *
 * 将每月投资预算自动拆分为：
 *   - Core DCA（底仓）：按日自动买入，保证长期不踏空
 *   - Acceleration Reserve（加速资金）：等待低估机会分批释放
 *
 * 示例：预算 $1000，Core 40% / Reserve 60%
 *   Core 每月 $400  → 每日 $13.33（按当月实际天数）
 *   Reserve 每月 $600 → 留存为战略资金
 */

export interface CapitalAllocationResult {
  monthlyBudget: number;
  corePercentage: number;
  reservePercentage: number;
  coreMonthly: number;
  reserveMonthly: number;
  coreDaily: number;
  daysInMonth: number;
}

export function allocateMonthlyBudget(
  config: CapitalAllocationConfig,
  now: Date = new Date()
): CapitalAllocationResult {
  const days = daysInMonth(now.getUTCFullYear(), now.getUTCMonth());
  const coreMonthly = round2((config.monthlyBudget * config.corePercentage) / 100);
  const reserveMonthly = round2((config.monthlyBudget * config.reservePercentage) / 100);
  const coreDaily = round2(coreMonthly / days);

  return {
    monthlyBudget: config.monthlyBudget,
    corePercentage: config.corePercentage,
    reservePercentage: config.reservePercentage,
    coreMonthly,
    reserveMonthly,
    coreDaily,
    daysInMonth: days,
  };
}

export function currentMonthISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}
