/**
 * 加速资金管理（Acceleration Reserve）类型定义
 */

/** 风险等级：由触发指标数量决定（0-3） */
export type RiskLevel = 0 | 1 | 2 | 3;

/** 每月资金分配配置 */
export interface CapitalAllocationConfig {
  monthlyBudget: number; // 每月投资预算（USD）
  corePercentage: number; // Core DCA 占比（默认 40）
  reservePercentage: number; // 加速资金占比（默认 60）
}

/** 加速释放规则（全部可配置） */
export interface AccelerationRulesConfig {
  level1Pct: number; // Level 1 释放比例（默认 10%）
  level2Pct: number; // Level 2 释放比例（默认 30%）
  level3Pct: number; // Level 3 释放比例（默认 60%）
  monthlyMaxDeploymentPct: number; // 每月最大释放比例（默认 100%）
  /** 加速资金初始池（留空时自动 = 每月预算 × 加速占比） */
  initialReserve: number | null;
}

/** 引擎运行配置（由路由从 Settings 解析） */
export interface AccelerationEngineConfig {
  initialReserve: number;
  rules: AccelerationRulesConfig;
}

/** 加速资金池持久化状态 */
export interface ReserveState {
  month: string; // YYYY-MM，跨月重置 deployedThisMonth
  initialReserve: number; // 本轮加速资金总额
  used: number; // 累计已释放
  deployedThisMonth: number; // 本月已释放
  lastDeployAt: string | null;
}

export type ReserveStatusType = 'available' | 'partial' | 'exhausted';

/** 资金池对外状态 */
export interface ReserveStatus {
  month: string;
  initialReserve: number;
  used: number;
  remaining: number;
  monthlyLimit: number;
  deployedThisMonth: number;
  monthlyRemaining: number;
  monthlyDeploymentPct: number;
  status: ReserveStatusType;
  level: RiskLevel;
  deployPct: number; // 当前等级释放比例
  deploySuggestion: number; // 理论释放金额（受等级比例约束，未扣月度/余额上限）
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
