import { round2 } from '../../utils/numbers';
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
 * AccelerationReserveEngine
 *
 * 加速资金管理核心引擎，负责：
 *   - 计算当前 Reserve 余额（Initial / Used / Remaining）
 *   - 根据 Risk Level 计算释放比例与金额
 *   - 判断剩余资金（余额不足时按实际余额释放）
 *   - 执行 Monthly Deployment Limit（防止连续触发快速耗尽）
 *   - 跨月重置本月释放计数
 *
 * 引擎不依赖任何页面/路由逻辑，可独立单元测试。
 */

export class AccelerationReserveEngine {
  constructor(private readonly store: ReserveStateRepository) {}

  /** 加载状态并处理跨月重置（月份变化时 deployedThisMonth 归零） */
  private async loadState(initialReserve: number, now: Date): Promise<ReserveState> {
    const state = await this.store.get();
    const month = currentMonthISO(now);
    if (state.month !== month || state.initialReserve <= 0) {
      const next: ReserveState = {
        ...state,
        month,
        deployedThisMonth: 0,
        // 已初始化的资金池保留；首次运行时写入配置值
        initialReserve: state.initialReserve > 0 ? state.initialReserve : initialReserve,
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
    const state = await this.loadState(config.initialReserve, now);
    const monthlyLimit = round2((state.initialReserve * config.rules.monthlyMaxDeploymentPct) / 100);
    const remaining = round2(Math.max(0, state.initialReserve - state.used));
    const monthlyRemaining = round2(Math.max(0, monthlyLimit - state.deployedThisMonth));
    const pct = riskLevelDeployPct(level, config.rules);
    const deploySuggestion = round2((state.initialReserve * pct) / 100);

    return {
      month: state.month,
      initialReserve: round2(state.initialReserve),
      used: round2(state.used),
      remaining,
      monthlyLimit,
      deployedThisMonth: round2(state.deployedThisMonth),
      monthlyRemaining,
      monthlyDeploymentPct: round2(
        monthlyLimit > 0 ? (state.deployedThisMonth / monthlyLimit) * 100 : 0
      ),
      status: remaining <= 0 ? 'exhausted' : state.used > 0 ? 'partial' : 'available',
      level,
      deployPct: pct,
      deploySuggestion,
    };
  }

  /**
   * 执行一次加速释放。
   * 实际释放 = min(等级比例金额, 剩余余额, 本月剩余额度)
   */
  async deploy(
    level: RiskLevel,
    config: AccelerationEngineConfig,
    now: Date = new Date()
  ): Promise<DeployResult> {
    let state = await this.loadState(config.initialReserve, now);
    const pct = riskLevelDeployPct(level, config.rules);
    const requestedAmount = round2((state.initialReserve * pct) / 100);
    const monthlyLimit = round2((state.initialReserve * config.rules.monthlyMaxDeploymentPct) / 100);
    const remaining = round2(Math.max(0, state.initialReserve - state.used));
    const monthlyRemaining = round2(Math.max(0, monthlyLimit - state.deployedThisMonth));

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
      used: round2(state.used + actualAmount),
      deployedThisMonth: round2(state.deployedThisMonth + actualAmount),
      lastDeployAt: now.toISOString(),
    };
    await this.store.save(state);

    return {
      level,
      requestedAmount,
      actualAmount,
      remaining: round2(Math.max(0, state.initialReserve - state.used)),
      monthlyRemaining: round2(Math.max(0, monthlyLimit - state.deployedThisMonth)),
      state,
      deployed: true,
      status: 'deployed',
    };
  }
}

export const accelerationReserveEngine = new AccelerationReserveEngine(reserveStateStore);
