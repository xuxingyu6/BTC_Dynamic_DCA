import { round2 } from '../../utils/numbers';
import { remainingSundaysInMonth } from '../../utils/opportunities';
import { currentMonthISO } from './capitalAllocationEngine';
import { reserveStateStore, type ReserveStateRepository } from './reserveStateStore';
import { computeRiskLevel, riskLevelDeployPct } from './riskLevelEngine';
import type {
  AccelerationEngineConfig,
  DeployResult,
  ReserveState,
  ReserveStatus,
  RiskLevel,
} from './types';

/**
 * AccelerationReserveEngine（加速资金滚动管理引擎）
 *
 * 资金池生命周期：
 *   每月新增 60% 投资金额进入加速资金池，未使用资金跨月自动保留。
 *
 *   当前余额 = 历史剩余 + 本月新增 − 已执行加速买入
 *
 * 释放规则（固定 10% / 30% / 60%）：
 *   释放基数固定为“本月加速资金额度”（每月投资金额 × 60%），
 *   而不是剩余余额 —— 避免连续触发出现递减：
 *     释放金额 = 本月加速资金额度 × 等级比例
 *     实际买入 = min(释放金额, 本月加速资金额度 − 本月已使用)
 *   例如本月额度 $600，Level 2 连续触发：180 → 180 → 180 → 60（剩余不足时按实际）。
 *
 * 引擎不依赖任何页面/路由逻辑，可独立单元测试。
 */

export class AccelerationReserveEngine {
  constructor(private readonly store: ReserveStateRepository) {}

  /**
   * 加载状态并处理滚动逻辑：
   *   - 跨月：上月余额 → 历史剩余，累加本月新增（每月投资金额 × 60%）
   *   - 本月内每月投资金额变化：本月新增与余额联动重算
   */
  private async loadState(monthlyAdded: number, now: Date): Promise<ReserveState> {
    const state = await this.store.get();
    const month = currentMonthISO(now);

    if (state.month !== month) {
      // 跨月滚动：上月余额保留为历史剩余，本月新增进入资金池
      const next: ReserveState = {
        ...state,
        month,
        carryover: round2(state.balance),
        monthlyAdded: round2(monthlyAdded),
        balance: round2(state.balance + monthlyAdded),
        deployedThisMonth: 0,
      };
      await this.store.save(next);
      return next;
    }

    if (state.monthlyAdded !== monthlyAdded) {
      // 首次运行或每月投资金额变化：余额 = 历史剩余 + 本月新增 − 已执行
      const next: ReserveState = {
        ...state,
        monthlyAdded: round2(monthlyAdded),
        balance: round2(Math.max(0, state.carryover + monthlyAdded - state.deployedThisMonth)),
      };
      await this.store.save(next);
      return next;
    }

    return state;
  }

  /** 查询当前资金池状态（含指定等级的理论释放金额） */
  async getStatus(
    config: AccelerationEngineConfig,
    level: RiskLevel,
    now: Date = new Date()
  ): Promise<ReserveStatus> {
    const state = await this.loadState(config.monthlyAdded, now);
    // 本月加速资金额度 = 每月投资金额 × 60%（固定释放基数）
    const monthlyAccelerationBudget = round2(state.monthlyAdded);
    const monthlyLimit = round2(
      (monthlyAccelerationBudget * config.rules.monthlyMaxDeploymentPct) / 100
    );
    const pct = riskLevelDeployPct(level, config.rules);
    const deploySuggestion = round2((monthlyAccelerationBudget * pct) / 100);

    return {
      month: state.month,
      balance: round2(state.balance),
      carryover: round2(state.carryover),
      monthlyAdded: round2(state.monthlyAdded),
      used: round2(state.used),
      deployedThisMonth: round2(state.deployedThisMonth),
      monthlyLimit,
      monthlyRemaining: round2(Math.max(0, monthlyLimit - state.deployedThisMonth)),
      monthlyDeploymentPct: round2(
        monthlyLimit > 0 ? (state.deployedThisMonth / monthlyLimit) * 100 : 0
      ),
      status: state.balance <= 0 ? 'exhausted' : state.deployedThisMonth > 0 ? 'partial' : 'available',
      level,
      deployPct: pct,
      deploySuggestion,
      opportunities: remainingSundaysInMonth(now),
    };
  }

  /**
   * 执行一次加速释放。
   * 实际释放 = min(当前余额 × 等级比例, 当前余额, 本月剩余额度)
   */
  async deploy(
    level: RiskLevel,
    config: AccelerationEngineConfig,
    now: Date = new Date()
  ): Promise<DeployResult> {
    let state = await this.loadState(config.monthlyAdded, now);
    const pct = riskLevelDeployPct(level, config.rules);
    // 本月加速资金额度 / 本月已使用金额（固定释放基数，避免递减）
    const monthlyAccelerationBudget = round2(state.monthlyAdded);
    const usedAccelerationAmount = round2(state.deployedThisMonth);
    const requestedAmount = round2((monthlyAccelerationBudget * pct) / 100);
    const monthlyLimit = round2(
      (monthlyAccelerationBudget * config.rules.monthlyMaxDeploymentPct) / 100
    );
    const remaining = round2(state.balance);
    const monthlyRemaining = round2(Math.max(0, monthlyLimit - usedAccelerationAmount));

    const base: Omit<DeployResult, 'status' | 'deployed'> = {
      level,
      requestedAmount,
      actualAmount: 0,
      remaining,
      monthlyRemaining,
      state,
    };

    if (level === 0 || pct <= 0) {
      return { ...base, deployed: false, status: 'no-opportunity' };
    }
    if (remaining <= 0) {
      return { ...base, deployed: false, status: 'exhausted' };
    }
    if (monthlyRemaining <= 0) {
      return { ...base, deployed: false, status: 'month-limit-reached' };
    }

    const actualAmount = round2(Math.min(requestedAmount, remaining, monthlyRemaining));
    if (actualAmount < 0.01) {
      return {
        ...base,
        deployed: false,
        status: remaining < requestedAmount ? 'insufficient' : 'month-limit-reached',
      };
    }

    state = {
      ...state,
      balance: round2(state.balance - actualAmount),
      deployedThisMonth: round2(state.deployedThisMonth + actualAmount),
      used: round2(state.used + actualAmount),
      lastDeployAt: now.toISOString(),
    };
    await this.store.save(state);

    return {
      level,
      requestedAmount,
      actualAmount,
      remaining: round2(state.balance),
      monthlyRemaining: round2(Math.max(0, monthlyLimit - state.deployedThisMonth)),
      state,
      deployed: true,
      status: 'deployed',
    };
  }
}

export const accelerationReserveEngine = new AccelerationReserveEngine(reserveStateStore);
