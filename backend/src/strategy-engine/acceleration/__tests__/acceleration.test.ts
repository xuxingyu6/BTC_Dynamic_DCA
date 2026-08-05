import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AccelerationReserveEngine } from '../accelerationReserveEngine';
import { allocateMonthlyBudget } from '../capitalAllocationEngine';
import { computeRiskLevel, riskLevelDeployPct } from '../riskLevelEngine';
import { remainingSundaysInMonth } from '../../../utils/opportunities';
import {
  CORE_RATIO,
  LEVEL1_RELEASE,
  LEVEL2_RELEASE,
  LEVEL3_RELEASE,
  RESERVE_RATIO,
} from '../fixedRules';
import type { ReserveStateRepository } from '../reserveStateStore';
import type {
  AccelerationEngineConfig,
  ReserveState,
} from '../types';

/** 内存版状态仓库（测试用） */
class InMemoryStore implements ReserveStateRepository {
  state: ReserveState = {
    month: '2026-08',
    balance: 0,
    carryover: 0,
    monthlyAdded: 0,
    used: 0,
    deployedThisMonth: 0,
    lastDeployAt: null,
  };

  async get(): Promise<ReserveState> {
    return { ...this.state };
  }

  async save(state: ReserveState): Promise<void> {
    this.state = { ...state };
  }
}

function makeConfig(overrides?: Partial<AccelerationEngineConfig>): AccelerationEngineConfig {
  return {
    monthlyAdded: 600,
    rules: {
      level1Pct: 10,
      level2Pct: 30,
      level3Pct: 60,
      monthlyMaxDeploymentPct: 100,
      ...(overrides?.rules ?? {}),
    },
    ...(overrides ?? {}),
  };
}

const NOW = new Date('2026-08-05T08:00:00.000Z');

describe('RiskLevelEngine', () => {
  test('指标触发数量 -> 风险等级映射', () => {
    assert.equal(computeRiskLevel(0), 0);
    assert.equal(computeRiskLevel(1), 1);
    assert.equal(computeRiskLevel(2), 2);
    assert.equal(computeRiskLevel(3), 3);
    // 越界值收敛到 0..3
    assert.equal(computeRiskLevel(-1), 0);
    assert.equal(computeRiskLevel(9), 3);
  });

  test('等级释放比例（固定 10% / 30% / 60%）', () => {
    const rules = makeConfig().rules;
    assert.equal(riskLevelDeployPct(0, rules), 0);
    assert.equal(riskLevelDeployPct(1, rules), 10);
    assert.equal(riskLevelDeployPct(2, rules), 30);
    assert.equal(riskLevelDeployPct(3, rules), 60);
  });
});

describe('CapitalAllocationEngine', () => {
  test('$1000 每月投资金额 -> 固定 40/60 拆分：底仓 $400 / 加速 $600，每日底仓 $13.33（固定 ÷30）', () => {
    const result = allocateMonthlyBudget({ monthlyInvestmentAmount: 1000 }, NOW);
    assert.equal(result.coreRatio, CORE_RATIO);
    assert.equal(result.reserveRatio, RESERVE_RATIO);
    assert.equal(result.coreMonthly, 400);
    assert.equal(result.reserveMonthly, 600);
    assert.equal(result.daysPerMonth, 30);
    assert.equal(result.coreDaily, 13.33); // 400 / 30
  });

  test('每月投资金额变化时按固定比例动态计算', () => {
    const result = allocateMonthlyBudget({ monthlyInvestmentAmount: 2000 }, NOW);
    assert.equal(result.coreMonthly, 800); // 2000 × 40%
    assert.equal(result.reserveMonthly, 1200); // 2000 × 60%
    assert.equal(result.coreDaily, 26.67); // 800 / 30
  });

  test('释放规则固定为 10% / 30% / 60%', () => {
    assert.equal(LEVEL1_RELEASE, 0.1);
    assert.equal(LEVEL2_RELEASE, 0.3);
    assert.equal(LEVEL3_RELEASE, 0.6);
    const rules = makeConfig().rules;
    assert.equal(rules.level1Pct, 10);
    assert.equal(rules.level2Pct, 30);
    assert.equal(rules.level3Pct, 60);
    assert.equal(rules.monthlyMaxDeploymentPct, 100);
  });
});

describe('每月剩余加仓机会（每周日检测）', () => {
  test('2026-08-05 剩余周日 = 8/9、8/16、8/23、8/30 共 4 次', () => {
    const result = remainingSundaysInMonth(new Date('2026-08-05T08:00:00.000Z'));
    assert.equal(result.remaining, 4);
    assert.deepEqual(result.dates, ['2026-08-09', '2026-08-16', '2026-08-23', '2026-08-30']);
    assert.equal(result.nextCheck, '2026-08-09');
  });

  test('当天为周日时包含当天', () => {
    const result = remainingSundaysInMonth(new Date('2026-08-30T08:00:00.000Z'));
    assert.equal(result.remaining, 1);
    assert.deepEqual(result.dates, ['2026-08-30']);
  });

  test('本月已无剩余周日时返回 0', () => {
    const result = remainingSundaysInMonth(new Date('2026-08-31T08:00:00.000Z'));
    assert.equal(result.remaining, 0);
    assert.deepEqual(result.dates, []);
    assert.equal(result.nextCheck, null);
  });
});

describe('AccelerationReserveEngine（滚动资金池）', () => {
  test('首次运行：本月新增 $600 → 余额 $600（累计余额 = 历史剩余 + 本月新增）', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const status = await engine.getStatus(makeConfig(), 2, NOW);
    assert.equal(status.status, 'available');
    assert.equal(status.balance, 600);
    assert.equal(status.carryover, 0);
    assert.equal(status.monthlyAdded, 600);
    assert.equal(status.deployedThisMonth, 0);
    assert.equal(status.deploySuggestion, 180); // 600 × 30%
  });

  test('释放按本月额度固定计算（不递减）：600×30% → 180 → 180 → 180 → 60', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const config = makeConfig();

    const r1 = await engine.deploy(2, config, NOW);
    assert.equal(r1.deployed, true);
    assert.equal(r1.requestedAmount, 180); // 600 × 30%
    assert.equal(r1.actualAmount, 180);
    assert.equal(r1.remaining, 420);

    const r2 = await engine.deploy(2, config, NOW);
    assert.equal(r2.requestedAmount, 180); // 仍然 600 × 30%
    assert.equal(r2.actualAmount, 180);
    assert.equal(r2.remaining, 240);

    const r3 = await engine.deploy(2, config, NOW);
    assert.equal(r3.requestedAmount, 180);
    assert.equal(r3.actualAmount, 180);
    assert.equal(r3.remaining, 60);

    // 第四次：理论 180，但本月剩余额度只有 60 → 实际 60
    const r4 = await engine.deploy(2, config, NOW);
    assert.equal(r4.requestedAmount, 180);
    assert.equal(r4.actualAmount, 60);
    assert.equal(r4.remaining, 0);

    // 额度用完后不再释放
    const r5 = await engine.deploy(2, config, NOW);
    assert.equal(r5.deployed, false);
    assert.equal(r5.status, 'exhausted');
  });

  test('跨月滚动：未使用资金自动保留并累加本月新增', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const config = makeConfig();

    // 8 月：余额 600，释放 180 → 420
    const r1 = await engine.deploy(2, config, NOW);
    assert.equal(r1.remaining, 420);

    // 9 月：历史剩余 420 + 本月新增 600 = 1020
    const nextMonth = new Date('2026-09-01T08:00:00.000Z');
    const status = await engine.getStatus(config, 2, nextMonth);
    assert.equal(status.month, '2026-09');
    assert.equal(status.carryover, 420);
    assert.equal(status.monthlyAdded, 600);
    assert.equal(status.balance, 1020);
    assert.equal(status.deployedThisMonth, 0);
    assert.equal(status.deploySuggestion, 180); // 本月额度 600 × 30%（固定基数）
  });

  test('Monthly Deployment Limit：50% 上限时按本月可用额度截断', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const config = makeConfig({
      rules: { ...makeConfig().rules, monthlyMaxDeploymentPct: 50 },
    });

    // 本月加速额度 = 600，月度上限 50% → 本月可用 300
    const r1 = await engine.deploy(2, config, NOW); // 释放基数固定 600×30% = 180
    assert.equal(r1.actualAmount, 180);

    const r2 = await engine.deploy(1, config, NOW); // 600×10% = 60
    assert.equal(r2.actualAmount, 60);

    const r3 = await engine.deploy(2, config, NOW); // 理论 180，本月剩余额度 60
    assert.equal(r3.actualAmount, 60);
    assert.equal(r3.monthlyRemaining, 0);

    const r4 = await engine.deploy(3, config, NOW);
    assert.equal(r4.deployed, false);
    assert.equal(r4.status, 'month-limit-reached');
  });

  test('Level 0 不释放（no-opportunity）', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const r = await engine.deploy(0, makeConfig(), NOW);
    assert.equal(r.deployed, false);
    assert.equal(r.status, 'no-opportunity');
    assert.equal(r.actualAmount, 0);
  });

  test('余额为 0 时不再释放（exhausted）', async () => {
    const store = new InMemoryStore();
    store.state = { ...store.state, balance: 0, monthlyAdded: 600 };
    const engine = new AccelerationReserveEngine(store);
    const r = await engine.deploy(3, makeConfig(), NOW);
    assert.equal(r.deployed, false);
    assert.equal(r.status, 'exhausted');
  });

  test('每月投资金额变化时，本月新增与余额联动重算', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    await engine.getStatus(makeConfig(), 2, NOW); // 余额 600
    assert.equal((await store.get()).balance, 600);

    // 每月投资金额 1000 → 2000：本月新增 600 → 1200
    const status = await engine.getStatus(makeConfig({ monthlyAdded: 1200 }), 2, NOW);
    assert.equal(status.monthlyAdded, 1200);
    assert.equal(status.balance, 1200);
    assert.equal(status.deploySuggestion, 360); // 1200 × 30%
  });
});
