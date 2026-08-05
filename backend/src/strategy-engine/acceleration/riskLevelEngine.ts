import type { AccelerationRulesConfig, RiskLevel } from './types';

/**
 * RiskLevelEngine
 *
 * 输入：三个周期指标的触发数量（0-3）
 * 输出：Risk Level（0-3）
 *
 * Level 0：无机会（正常区域）
 * Level 1：轻度机会（轻度低估）
 * Level 2：明显机会（明显低估）
 * Level 3：极端机会（极端低估）
 */

export function computeRiskLevel(triggeredCount: number): RiskLevel {
  const clamped = Math.min(3, Math.max(0, Math.trunc(triggeredCount)));
  return clamped as RiskLevel;
}

/** 根据等级返回释放比例（%） */
export function riskLevelDeployPct(level: RiskLevel, rules: AccelerationRulesConfig): number {
  switch (level) {
    case 1:
      return rules.level1Pct;
    case 2:
      return rules.level2Pct;
    case 3:
      return rules.level3Pct;
    default:
      return 0;
  }
}

/** 等级对应的市场状态标识（用于加速买入记录） */
export function riskLevelMarketState(level: RiskLevel): string {
  switch (level) {
    case 3:
      return 'extreme-undervalued';
    case 2:
      return 'undervalued';
    case 1:
      return 'slight-undervalued';
    default:
      return 'normal';
  }
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  0: 'Level 0 · 正常区域',
  1: 'Level 1 · 轻度低估',
  2: 'Level 2 · 明显低估',
  3: 'Level 3 · 极端低估',
};
