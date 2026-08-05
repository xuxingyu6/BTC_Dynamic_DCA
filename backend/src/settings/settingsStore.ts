import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { config } from '../config';
import { getPrisma } from '../db/prisma';
import type { IndicatorThresholds, StrategyConfig } from '../strategy-engine/types';
import type { AccelerationRulesConfig, CapitalAllocationConfig } from '../strategy-engine/acceleration/types';
import type { PortfolioMode } from '../utils/portfolio';
import {
  LEVEL1_RELEASE,
  LEVEL2_RELEASE,
  LEVEL3_RELEASE,
  MONTHLY_MAX_DEPLOY_RATIO,
} from '../strategy-engine/acceleration/fixedRules';

/**
 * 应用设置存储（JSON 文件）。
 *
 * 资金管理模块：
 *   - 用户仅可修改“每月投资金额”（monthlyInvestmentAmount）
 *   - 底仓/加速比例（40/60）与释放规则（10/30/60）、月度上限（100%）
 *     均为策略核心固定参数，保存时强制覆写，用户不可修改。
 */

export interface DataSettings {
  providerMode: 'auto' | 'demo';
  manualOverride: {
    mvrv: number | null;
    puell: number | null;
  };
}

export interface UiSettings {
  refreshIntervalSec: number;
}

/**
 * BTC 持仓配置（手动录入模式）
 *
 * 用户只需输入「BTC 持有数量 + 平均持仓成本」，
 * 持仓本金、当前价值、浮动盈亏与收益率由系统自动计算。
 * mode 字段预留扩展：manual = 手动录入（当前）；records = 交易记录自动计算（未来）。
 */
export interface PortfolioConfig {
  /** 持仓来源模式（当前仅实现手动录入） */
  mode: PortfolioMode;
  /** BTC 持有数量 */
  btcAmount: number;
  /** 平均持仓成本（USD/BTC） */
  avgCost: number;
}

export interface AppSettings {
  strategy: StrategyConfig;
  indicators: IndicatorThresholds;
  capital: CapitalAllocationConfig;
  acceleration: AccelerationRulesConfig;
  portfolio: PortfolioConfig;
  data: DataSettings;
  ui: UiSettings;
}

export function defaultSettings(): AppSettings {
  return {
    strategy: {
      frequency: 'daily',
      feeRatePct: 0.1,
    },
    indicators: {
      ma200Multiplier: 1.1,
      mvrvThreshold: 1.0,
      mvrvExtreme: 0.8,
      puellThreshold: 0.6,
      puellExtreme: 0.5,
    },
    capital: {
      monthlyInvestmentAmount: 1000,
    },
    acceleration: {
      level1Pct: Math.round(LEVEL1_RELEASE * 100),
      level2Pct: Math.round(LEVEL2_RELEASE * 100),
      level3Pct: Math.round(LEVEL3_RELEASE * 100),
      monthlyMaxDeploymentPct: Math.round(MONTHLY_MAX_DEPLOY_RATIO * 100),
    },
    portfolio: {
      mode: 'manual',
      btcAmount: 0,
      avgCost: 0,
    },
    data: {
      providerMode: 'auto',
      manualOverride: { mvrv: null, puell: null },
    },
    ui: {
      refreshIntervalSec: 300,
    },
  };
}

const appSettingsSchema = z.object({
  strategy: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    feeRatePct: z.number().min(0).max(5),
  }),
  indicators: z.object({
    ma200Multiplier: z.number().min(1).max(2),
    mvrvThreshold: z.number().min(0).max(2),
    mvrvExtreme: z.number().min(0).max(2),
    puellThreshold: z.number().min(0).max(2),
    puellExtreme: z.number().min(0).max(2),
  }),
  capital: z.object({
    monthlyInvestmentAmount: z.number().min(1).max(10_000_000),
  }),
  acceleration: z.object({
    level1Pct: z.literal(10),
    level2Pct: z.literal(30),
    level3Pct: z.literal(60),
    monthlyMaxDeploymentPct: z.literal(100),
  }),
  portfolio: z.object({
    mode: z.enum(['manual', 'records']),
    btcAmount: z.number().min(0).max(1_000_000),
    avgCost: z.number().min(0).max(100_000_000),
  }),
  data: z.object({
    providerMode: z.enum(['auto', 'demo']),
    manualOverride: z.object({
      mvrv: z.number().min(0).max(10).nullable(),
      puell: z.number().min(0).max(10).nullable(),
    }),
  }),
  ui: z.object({
    refreshIntervalSec: z.number().int().min(10).max(3600),
  }),
});

type MergedSettings = AppSettings;

/** 策略核心固定参数：保存时强制覆写，忽略客户端传值 */
function withFixedRules(base: AppSettings): AppSettings {
  return {
    ...base,
    strategy: { ...base.strategy, frequency: 'daily' },
    capital: { monthlyInvestmentAmount: base.capital.monthlyInvestmentAmount },
    acceleration: {
      level1Pct: Math.round(LEVEL1_RELEASE * 100),
      level2Pct: Math.round(LEVEL2_RELEASE * 100),
      level3Pct: Math.round(LEVEL3_RELEASE * 100),
      monthlyMaxDeploymentPct: Math.round(MONTHLY_MAX_DEPLOY_RATIO * 100),
    },
  };
}

export class SettingsStore {
  private current: AppSettings | null = null;
  private readonly file = path.join(config.dataDir, 'settings.json');

  /** PostgreSQL 单行表读写（id 恒为 1），失败时回退本地文件 */
  private async loadRaw(): Promise<unknown | null> {
    if (config.databaseMode === 'postgres') {
      const prisma = await getPrisma();
      if (prisma) {
        try {
          const row = await (
            prisma as unknown as {
              appSetting: {
                findUnique(args: { where: { id: number } }): Promise<{ data: unknown } | null>;
              };
            }
          ).appSetting.findUnique({ where: { id: 1 } });
          return row?.data ?? null;
        } catch (err) {
          console.warn(`[settings] 读取 PostgreSQL 失败，回退文件: ${(err as Error).message}`);
        }
      }
    }
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private async saveRaw(settings: AppSettings): Promise<void> {
    if (config.databaseMode === 'postgres') {
      const prisma = await getPrisma();
      if (prisma) {
        await (
          prisma as unknown as {
            appSetting: {
              upsert(args: {
                where: { id: number };
                create: { id: number; data: unknown };
                update: { data: unknown };
              }): Promise<unknown>;
            };
          }
        ).appSetting.upsert({
          where: { id: 1 },
          create: { id: 1, data: settings },
          update: { data: settings },
        });
        return;
      }
    }
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(settings, null, 2), 'utf8');
  }

  async get(): Promise<AppSettings> {
    if (config.databaseMode !== 'postgres' && this.current) return this.current;
    try {
      const raw = await this.loadRaw();
      const obj = (raw && typeof raw === 'object'
        ? raw
        : {}) as { portfolio?: Record<string, unknown> };
      // 兼容旧版持仓配置：累计投入金额（totalInvested）→ 平均持仓成本（avgCost）
      const pf = obj.portfolio;
      if (pf && typeof pf === 'object') {
        if (pf.mode === undefined) pf.mode = 'manual';
        if (pf.avgCost === undefined && typeof pf.totalInvested === 'number') {
          const btc = Number(pf.btcAmount) || 0;
          const invested = Number(pf.totalInvested) || 0;
          pf.avgCost = btc > 0 ? Math.round((invested / btc) * 100) / 100 : 0;
          delete pf.totalInvested;
        }
      }
      const parsed = appSettingsSchema.safeParse(obj);
      if (parsed.success) {
        this.current = withFixedRules(parsed.data);
        return this.current;
      }
    } catch {
      /* 文件不存在或损坏时使用默认值 */
    }
    this.current = withFixedRules(defaultSettings());
    return this.current;
  }

  async update(patch: Partial<MergedSettings>): Promise<AppSettings> {
    const base = await this.get();
    const merged: AppSettings = {
      strategy: { ...base.strategy, ...(patch.strategy ?? {}) },
      indicators: { ...base.indicators, ...(patch.indicators ?? {}) },
      capital: { ...base.capital, ...(patch.capital ?? {}) },
      acceleration: { ...base.acceleration, ...(patch.acceleration ?? {}) },
      portfolio: { ...base.portfolio, ...(patch.portfolio ?? {}) },
      data: {
        providerMode: patch.data?.providerMode ?? base.data.providerMode,
        manualOverride: {
          ...base.data.manualOverride,
          ...(patch.data?.manualOverride ?? {}),
        },
      },
      ui: { ...base.ui, ...(patch.ui ?? {}) },
    };
    const validated = appSettingsSchema.parse(withFixedRules(merged));
    this.current = validated;
    await this.saveRaw(validated);
    return validated;
  }

  async reset(): Promise<AppSettings> {
    this.current = withFixedRules(defaultSettings());
    await this.saveRaw(this.current);
    return this.current;
  }
}

export const settingsStore = new SettingsStore();
