import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computePortfolioStats } from '../portfolio';

describe('PortfolioStats（BTC 持仓统计 · 手动录入模式）', () => {
  test('0.02361 BTC / 平均成本 $83151 / 价格 $85000 → 本金 $1963.2，价值 $2006.85，盈亏 +$43.65 / +2.22%', () => {
    const s = computePortfolioStats(
      { mode: 'manual', btcAmount: 0.02361, avgCost: 83151 },
      85000
    );
    assert.equal(s.mode, 'manual');
    assert.equal(s.principal, 1963.2); // 0.02361 × 83151
    assert.equal(s.currentValue, 2006.85); // 0.02361 × 85000
    assert.equal(s.pnl, 43.65);
    assert.equal(s.pnlPct, 2.22); // (85000-83151)/83151
  });

  test('BTC 数量为 0 时本金与收益均为 0', () => {
    const s = computePortfolioStats({ mode: 'manual', btcAmount: 0, avgCost: 0 }, 85000);
    assert.equal(s.principal, 0);
    assert.equal(s.currentValue, 0);
    assert.equal(s.pnl, 0);
    assert.equal(s.pnlPct, 0);
  });

  test('亏损场景：成本高于当前价格 → 收益率为负', () => {
    const s = computePortfolioStats({ mode: 'manual', btcAmount: 1, avgCost: 80000 }, 60000);
    assert.equal(s.principal, 80000);
    assert.equal(s.currentValue, 60000);
    assert.equal(s.pnl, -20000);
    assert.equal(s.pnlPct, -25);
  });
});
