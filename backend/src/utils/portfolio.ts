import { round2 } from './numbers';

/**
 * BTC 持仓统计（手动录入模式）
 *
 * 模式1（当前实现）：手动输入「BTC 持有数量 + 平均持仓成本」
 *   持仓本金 = BTC 数量 × 平均成本
 *   当前持仓价值 = BTC 数量 × 当前价格
 *   浮动盈亏 = 当前价值 − 持仓本金
 *   收益率 = (当前价格 − 平均成本) ÷ 平均成本
 *
 * 模式2（预留，未实现）：交易记录自动计算持仓成本。
 *   通过 mode 字段区分，后续接入交易记录后即可扩展。
 */

export type PortfolioMode = 'manual' | 'records';

/** BTC 持仓输入（用户配置） */
export interface PortfolioInput {
  /** 持仓来源模式：manual = 手动录入（当前）；records = 交易记录自动计算（预留） */
  mode: PortfolioMode;
  /** 当前 BTC 持有数量 */
  btcAmount: number;
  /** 平均持仓成本（USD/BTC），手动模式用户录入 */
  avgCost: number;
}

/** BTC 持仓统计（结合当前价格自动计算） */
export interface PortfolioStats {
  mode: PortfolioMode;
  btcAmount: number;
  /** 平均持仓成本（USD/BTC） */
  avgCost: number;
  /** 当前 BTC 价格（USD） */
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

export function computePortfolioStats(input: PortfolioInput, price: number): PortfolioStats {
  const { mode, btcAmount, avgCost } = input;
  const principal = round2(btcAmount * avgCost);
  const currentValue = round2(btcAmount * price);
  const pnl = round2(currentValue - principal);
  const pnlPct = avgCost > 0 ? round2(((price - avgCost) / avgCost) * 100) : 0;

  return {
    mode,
    btcAmount,
    avgCost: round2(avgCost),
    price: round2(price),
    principal,
    currentValue,
    pnl,
    pnlPct,
  };
}
