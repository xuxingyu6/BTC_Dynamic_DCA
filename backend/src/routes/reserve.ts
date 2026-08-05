import { Router } from 'express';
import { settingsStore } from '../settings/settingsStore';
import { marketDataService } from '../services/marketDataService';
import { accelerationReserveEngine } from '../strategy-engine/acceleration/accelerationReserveEngine';
import { reserveStateStore } from '../strategy-engine/acceleration/reserveStateStore';
import { allocateMonthlyBudget } from '../strategy-engine/acceleration/capitalAllocationEngine';
import { computeRiskLevel, riskLevelMarketState } from '../strategy-engine/acceleration/riskLevelEngine';
import { getRecordRepository } from '../db/recordsRepository';
import type { AccelerationEngineConfig } from '../strategy-engine/acceleration/types';
import { round8 } from '../utils/numbers';
import { toISODate } from '../utils/time';

/**
 * 加速资金管理路由：
 *   GET  /api/reserve          资金池状态 + 当前风险等级 + 释放建议
 *   POST /api/reserve/deploy   执行一次加速买入（自动记录交易）
 *   POST /api/reserve/reset    重置资金池（用于测试 / 新周期）
 */

export const reserveRouter = Router();

/** 从 Settings 解析引擎配置 */
async function resolveEngineConfig(): Promise<AccelerationEngineConfig> {
  const settings = await settingsStore.get();
  const allocation = allocateMonthlyBudget(settings.capital);
  const initialReserve =
    settings.acceleration.initialReserve ?? allocation.reserveMonthly;
  return { initialReserve, rules: settings.acceleration };
}

/** 基于实时指标计算当前风险等级 */
async function currentRisk() {
  const snapshot = await marketDataService.getIndicatorsSnapshot();
  const triggered = snapshot.indicators.filter((i) => i.triggered).length;
  const level = computeRiskLevel(triggered);
  return {
    level,
    triggered,
    price: snapshot.market.price,
    indicators: snapshot.indicators,
  };
}

reserveRouter.get('/reserve', async (_req, res, next) => {
  try {
    const config = await resolveEngineConfig();
    const risk = await currentRisk();
    const status = await accelerationReserveEngine.getStatus(config, risk.level);
    const settings = await settingsStore.get();
    const allocation = allocateMonthlyBudget(settings.capital);
    res.json({
      ...status,
      triggered: risk.triggered,
      price: risk.price,
      allocation,
      rules: settings.acceleration,
    });
  } catch (err) {
    next(err);
  }
});

reserveRouter.post('/reserve/deploy', async (_req, res, next) => {
  try {
    const config = await resolveEngineConfig();
    const risk = await currentRisk();
    const result = await accelerationReserveEngine.deploy(risk.level, config);

    let record = null;
    if (result.deployed && result.actualAmount > 0) {
      const repo = await getRecordRepository();
      const quantity = round8(result.actualAmount / risk.price);
      record = await repo.create({
        date: toISODate(new Date()),
        price: risk.price,
        amount: result.actualAmount,
        quantity,
        marketState: riskLevelMarketState(result.level),
        transactionType: 'acceleration',
        riskLevel: result.level,
        triggeredIndicators: risk.triggered,
        remainingReserve: result.remaining,
        note: `加速资金释放 Level ${result.level}（${risk.triggered}/3 指标触发）`,
      });
    }

    res.status(result.deployed ? 201 : 200).json({
      result,
      record,
      level: risk.level,
      triggered: risk.triggered,
      price: risk.price,
    });
  } catch (err) {
    next(err);
  }
});

reserveRouter.post('/reserve/reset', async (_req, res, next) => {
  try {
    const state = await reserveStateStore.reset();
    res.json({ ok: true, state });
  } catch (err) {
    next(err);
  }
});
