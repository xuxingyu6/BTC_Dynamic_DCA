/**
 * 策略核心固定参数（用户不可修改）
 *
 * 资金管理模块的核心比例与释放规则全部固定在此处，
 * 用户仅可修改“每月投资金额”（monthlyInvestmentAmount），
 * 其余金额一律由这些固定参数动态计算。
 */

/** 长期底仓资金比例：40% */
export const CORE_RATIO = 0.4;

/** 加速资金比例：60% */
export const RESERVE_RATIO = 0.6;

/** 轻度机会（触发 1 个指标）释放加速资金的 10% */
export const LEVEL1_RELEASE = 0.1;

/** 明显机会（触发 2 个指标）释放加速资金的 30% */
export const LEVEL2_RELEASE = 0.3;

/** 极端机会（触发 3 个指标）释放加速资金的 60% */
export const LEVEL3_RELEASE = 0.6;

/** 本月最大使用额度：加速资金池的 100% */
export const MONTHLY_MAX_DEPLOY_RATIO = 1.0;

/** 底仓每日固定买入：底仓月额度 ÷ 30 */
export const CORE_DAILY_DIVISOR = 30;

/** 机会等级中文标签（与资金管理模块展示一致） */
export const OPPORTUNITY_LABELS = ['正常区间', '轻度机会', '明显机会', '极端机会'] as const;

export function opportunityLabel(level: number): string {
  return OPPORTUNITY_LABELS[Math.min(3, Math.max(0, level))] ?? '正常区间';
}
