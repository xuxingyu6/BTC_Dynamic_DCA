import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AccelerationReserveEngine } from '../accelerationReserveEngine';
import { allocateMonthlyBudget } from '../capitalAllocationEngine';
import { computeRiskLevel, riskLevelDeployPct } from '../riskLevelEngine';
import type { ReserveStateRepository } from '../reserveStateStore';
import type {
  AccelerationEngineConfig,
  ReserveState,
} from '../types';

/** 内存版状态仓库（测试用） */
class InMemoryStore implements ReserveStateRepository {
  state: ReserveState = {
    month: '2026-08',
    initialReserve: 0,
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
    initialReserve: 600,
    rules: {
      level1Pct: 10,
      level2Pct: 30,
      level3Pct: 60,
      monthlyMaxDeploymentPct: 100,
      initialReserve: null,
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

  test('等级释放比例（默认 10% / 30% / 60%）', () => {
    const rules = makeConfig().rules;
    assert.equal(riskLevelDeployPct(0, rules), 0);
    assert.equal(riskLevelDeployPct(1, rules), 10);
    assert.equal(riskLevelDeployPct(2, rules), 30);
    assert.equal(riskLevelDeployPct(3, rules), 60);
  });
});

describe('CapitalAllocationEngine', () => {
  test('$1000 预算 40/60 拆分 -> Core $400 / Reserve $600，按 8 月 31 天计算每日 Core', () => {
    const result = allocateMonthlyBudget(
      { monthlyBudget: 1000, corePercentage: 40, reservePercentage: 60 },
      NOW
    );
    assert.equal(result.coreMonthly, 400);
    assert.equal(result.reserveMonthly, 600);
    assert.equal(result.daysInMonth, 31);
    assert.equal(result.coreDaily, 12.9); // 400 / 31
  });

  test('30 天月份每日 Core = 400 / 30 ≈ 13.33', () => {
    const result = allocateMonthlyBudget(
      { monthlyBudget: 1000, corePercentage: 40, reservePercentage: 60 },
      new Date('2026-04-05T00:00:00.000Z') // 4 月 30 天
    );
    assert.equal(result.daysInMonth, 30);
    assert.equal(result.coreDaily, 13.33);
  });

  test('自定义比例 25/75', () => {
    const result = allocateMonthlyBudget(
      { monthlyBudget: 800, corePercentage: 25, reservePercentage: 75 },
      NOW
    );
    assert.equal(result.coreMonthly, 200);
    assert.equal(result.reserveMonthly, 600);
  });
});

describe('AccelerationReserveEngine', () => {
  test('初始状态：可用（Available），未释放', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const status = await engine.getStatus(makeConfig(), 2, NOW);
    assert.equal(status.status, 'available');
    assert.equal(status.initialReserve, 600);
    assert.equal(status.used, 0);
    assert.equal(status.remaining, 600);
    assert.equal(status.deploySuggestion, 180); // 600 × 30%
  });

  test('连续触发示例：L2(180) → L2(180) → L3(实际 240) → 耗尽', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const config = makeConfig();

    // 第一周：Level 2 → 释放 30% = 180
    const r1 = await engine.deploy(2, config, NOW);
    assert.equal(r1.deployed, true);
    assert.equal(r1.actualAmount, 180);
    assert.equal(r1.remaining, 420);

    // 第二周：Level 2 → 再次释放 180，剩余 240
    const r2 = await engine.deploy(2, config, NOW);
    assert.equal(r2.actualAmount, 180);
    assert.equal(r2.remaining, 240);

    // 第三周：Level 3 → 理论 360，但余额只剩 240 → 实际 240
    const r3 = await engine.deploy(3, config, NOW);
    assert.equal(r3.deployed, true);
    assert.equal(r3.requestedAmount, 360);
    assert.equal(r3.actualAmount, 240);
    assert.equal(r3.remaining, 0);

    // 第四周：Level 3 → 余额 0 → Exhausted
    const r4 = await engine.deploy(3, config, NOW);
    assert.equal(r4.deployed, false);
    assert.equal(r4.status, 'exhausted');
  });

  test('Monthly Deployment Limit：50% 上限时按本月剩余额度截断', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const config = makeConfig({
      rules: { ...makeConfig().rules, monthlyMaxDeploymentPct: 50 },
    });

    // 本月额度 = 600 × 50% = 300
    const r1 = await engine.deploy(2, config, NOW); // 180
    assert.equal(r1.actualAmount, 180);

    const r2 = await engine.deploy(1, config, NOW); // 60 → 累计 240
    assert.equal(r2.actualAmount, 60);

    // 再来 Level 2（180）：本月额度剩 60 → 实际 60
    const r3 = await engine.deploy(2, config, NOW);
    assert.equal(r3.actualAmount, 60);
    assert.equal(r3.monthlyRemaining, 0);

    // 额度用尽后再触发 → month-limit-reached
    const r4 = await engine.deploy(3, config, NOW);
    assert.equal(r4.deployed, false);
    assert.equal(r4.status, 'month-limit-reached');
  });

  test('跨月重置：本月已释放归零，累计 used 保留', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const config = makeConfig();

    await engine.deploy(2, config, NOW); // 8 月释放 180
    const nextMonth = new Date('2026-09-01T08:00:00.000Z');
    const status = await engine.getStatus(config, 2, nextMonth);

    assert.equal(status.month, '2026-09');
    assert.equal(status.deployedThisMonth, 0);
    assert.equal(status.used, 180);
    assert.equal(status.remaining, 420);
    assert.equal(status.deploySuggestion, 180); // 新月份额度恢复
  });

  test('Level 0 不释放（no-opportunity）', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const r = await engine.deploy(0, makeConfig(), NOW);
    assert.equal(r.deployed, false);
    assert.equal(r.status, 'no-opportunity');
    assert.equal(r.actualAmount, 0);
  });

  test('首次运行自动初始化资金池（initialReserve = 配置值）', async () => {
    const store = new InMemoryStore();
    const engine = new AccelerationReserveEngine(store);
    const status = await engine.getStatus(makeConfig({ initialReserve: 750 }), 1, NOW);
    assert.equal(status.initialReserve, 750);
    assert.equal(status.deploySuggestion, 75); // 750 × 10%
  });
});
