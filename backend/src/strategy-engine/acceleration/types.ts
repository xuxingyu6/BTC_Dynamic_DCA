/**
 * 加速资金管理类型定义
 *
 * 核心比例（40/60）与释放规则（10/30/60）均为固定参数，
 * 定义在 fixedRules.ts 中，用户不可修改。
 *
 * 资金池采用滚动管理：每月新增 60% 投资金额，未使用资金跨月自动保留。
 */

/** 风险等级：由触发指标数量决定（0-3） */
export type RiskLevel = 0 | 1 | 2 | 3;

/** 每月资金分配配置（用户仅可修改每月投资金额） */
export interface CapitalAllocationConfig {
  /** 每月投资金额（USD）——唯一由用户自定义的资金参数 */
  monthlyInvestmentAmount: number;
}

/** 加速释放规则（固定值，由 fixedRules.ts 保证） */
export interface AccelerationRulesConfig {
  level1Pct: number; // 轻度机会释放比例（固定 10%）
  level2Pct: number; // 明显机会释放比例（固定 30%）
  level3Pct: number; // 极端机会释放比例（固定 60%）
  monthlyMaxDeploymentPct: number; // 本月最大使用额度（固定 100%）
}

/** 引擎运行配置（由路由从 Settings + 固定规则解析） */
export interface AccelerationEngineConfig {
  /** 本月新增加速资金（每月投资金额 × 60%） */
  monthlyAdded: number;
  rules: AccelerationRulesConfig;
}

/** 加速资金池持久化状态（滚动管理，跨月保留） */
export interface ReserveState {
  month: string; // YYYY-MM，跨月滚动
  /** 当前加速资金余额（累计，跨月保留） */
  balance: number;
  /** 历史剩余（本月开始时从上月保留的余额） */
  carryover: number;
  /** 本月新增加速资金（每月投资金额 × 60%） */
  monthlyAdded: number;
  /** 历史累计已使用 */
  used: number;
  /** 本月已执行加速买入 */
  deployedThisMonth: number;
  /** 本月已执行加速买入次数（每次成功释放 +1），跨月重置为 0 */
  monthlyAccelerationExecutions: number;
  lastDeployAt: string | null;
}

export type ReserveStatusType = 'available' | 'partial' | 'exhausted';

/** 资金池对外状态 */
export interface ReserveStatus {
  month: string;
  /** 当前加速资金余额（累计余额） */
  balance: number;
  /** 历史剩余 */
  carryover: number;
  /** 本月新增加速资金 */
  monthlyAdded: number;
  /** 历史累计已使用 */
  used: number;
  /** 本月已执行加速买入 */
  deployedThisMonth: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  monthlyDeploymentPct: number;
  status: ReserveStatusType;
  level: RiskLevel;
  deployPct: number; // 当前等级释放比例
  deploySuggestion: number; // 理论释放金额（当前余额 × 等级比例）
  /** 本月剩余加仓机会（每周日检测） */
  opportunities: OpportunitiesInfo;
  /** 本月理论检测机会次数（本月剩余周日数） */
  monthlyOpportunities: number;
  /** 本月已执行加速买入次数 */
  monthlyExecutions: number;
  /** 剩余加仓机会 = 本月理论检测机会 − 本月已执行 */
  monthlyRemainingOpportunities: number;
}

/** 本月剩余加仓机会信息 */
export interface OpportunitiesInfo {
  remaining: number; // 本月剩余周日次数
  dates: string[]; // 剩余周日日期列表（YYYY-MM-DD）
  nextCheck: string | null; // 最近一次检测日期
}

export type DeployStatus =
  | 'deployed'
  | 'no-opportunity'
  | 'exhausted'
  | 'month-limit-reached'
  | 'insufficient';

/** 释放执行结果 */
export interface DeployResult {
  deployed: boolean;
  status: DeployStatus;
  level: RiskLevel;
  requestedAmount: number;
  actualAmount: number;
  remaining: number;
  monthlyRemaining: number;
  state: ReserveState;
}
