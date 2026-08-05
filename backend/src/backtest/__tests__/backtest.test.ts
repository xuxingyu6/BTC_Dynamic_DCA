import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runBacktest, type BacktestRequest } from '../backtestEngine';
import { generateDemoBars } from '../../services/providers/demoData';

function makeRequest(overrides?: Partial<BacktestRequest>): BacktestRequest {
  return {
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    monthlyInvestmentAmount: 1000,
    ma200Multiplier: 1.1,
    mvrvThreshold: 1.0,
    puellThreshold: 0.6,
    feeRatePct: 0.1,
    ...(overrides ?? {}),
  };
}

describe('BacktestEngine（相同总预算比较）', () => {
  test('24 个月 × $1000/月：两策略投入本金一致，公平校验通过', () => {
    const bars = generateDemoBars();
    const result = runBacktest(makeRequest(), bars, '演示数据（Demo）');

    assert.equal(result.fairness.months, 24);
    assert.equal(result.fairness.fair, true);
    assert.ok(Math.abs(result.fairness.investedA - 24000) < 0.5, '普通 DCA 总投入应约为 $24000');
    assert.ok(Math.abs(result.fairness.investedB - result.fairness.investedA) < 0.01);

    // 动态 DCA 应累计更多 BTC（同本金下），且收益率、最大回撤均有结果
    assert.equal(result.summary.b.totalInvested, result.summary.a.totalInvested);
    assert.ok(result.summary.b.btcAccumulated > 0);
    assert.ok(result.summary.a.btcAccumulated > 0);
    assert.ok(result.summary.a.maxDrawdownPct > 0);
    assert.ok(result.summary.b.maxDrawdownPct > 0);
    assert.ok(Number.isFinite(result.summary.delta.btcGainPct));
  });

  test('部分月份按天数折算预算，公平校验依然通过', () => {
    const bars = generateDemoBars();
    const result = runBacktest(
      makeRequest({ startDate: '2024-06-15', endDate: '2025-03-10' }),
      bars,
      '演示数据（Demo）'
    );
    assert.equal(result.fairness.fair, true);
    assert.ok(result.fairness.investedA > 0);
    assert.ok(Math.abs(result.fairness.diff) < 0.01);
  });

  test('非法区间抛出错误', () => {
    const bars = generateDemoBars();
    assert.throws(() =>
      runBacktest(makeRequest({ startDate: '2025-12-31', endDate: '2024-01-01' }), bars, '演示数据（Demo）')
    );
  });
});
