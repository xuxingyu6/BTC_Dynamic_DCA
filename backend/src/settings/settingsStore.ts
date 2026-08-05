import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { config } from '../config';
import type { IndicatorThresholds, StrategyConfig } from '../strategy-engine/types';
import type { AccelerationRulesConfig, CapitalAllocationConfig } from '../strategy-engine/acceleration/types';

/**
 * 应用设置存储（JSON 文件）。
 * 所有策略参数均可由用户在 Settings 页面修改，不写死。
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

export interface AppSettings {
  strategy: StrategyConfig;
  indicators: IndicatorThresholds;
  capital: CapitalAllocationConfig;
  acceleration: AccelerationRulesConfig;
  data: DataSettings;
  ui: UiSettings;
}

export function defaultSettings(): AppSettings {
  return {
    strategy: {
      baseAmount: 100,
      level1Amount: 500,
      level2Amount: 1000,
      level3Amount: 1500,
      frequency: 'weekly',
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
      monthlyBudget: 1000,
      corePercentage: 40,
      reservePercentage: 60,
    },
    acceleration: {
      level1Pct: 10,
      level2Pct: 30,
      level3Pct: 60,
      monthlyMaxDeploymentPct: 100,
      initialReserve: null, // null = 自动 = 预算 × 加速占比
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
    baseAmount: z.number().min(1).max(1_000_000),
    level1Amount: z.number().min(0).max(1_000_000),
    level2Amount: z.number().min(0).max(1_000_000),
    level3Amount: z.number().min(0).max(1_000_000),
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
  capital: z
    .object({
      monthlyBudget: z.number().min(1).max(10_000_000),
      corePercentage: z.number().min(1).max(99),
      reservePercentage: z.number().min(1).max(99),
    })
    .refine((c) => Math.round(c.corePercentage + c.reservePercentage) === 100, {
      message: 'Core 与 Reserve 占比之和必须为 100%',
    }),
  acceleration: z.object({
    level1Pct: z.number().min(0).max(100),
    level2Pct: z.number().min(0).max(100),
    level3Pct: z.number().min(0).max(100),
    monthlyMaxDeploymentPct: z.number().min(1).max(100),
    initialReserve: z.number().min(1).max(10_000_000).nullable(),
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

export class SettingsStore {
  private current: AppSettings | null = null;
  private readonly file = path.join(config.dataDir, 'settings.json');

  async get(): Promise<AppSettings> {
    if (this.current) return this.current;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = appSettingsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        this.current = parsed.data;
        return parsed.data;
      }
    } catch {
      /* 文件不存在或损坏时使用默认值 */
    }
    this.current = defaultSettings();
    return this.current;
  }

  async update(patch: Partial<MergedSettings>): Promise<AppSettings> {
    const base = await this.get();
    const merged: AppSettings = {
      strategy: { ...base.strategy, ...(patch.strategy ?? {}) },
      indicators: { ...base.indicators, ...(patch.indicators ?? {}) },
      capital: { ...base.capital, ...(patch.capital ?? {}) },
      acceleration: { ...base.acceleration, ...(patch.acceleration ?? {}) },
      data: {
        providerMode: patch.data?.providerMode ?? base.data.providerMode,
        manualOverride: {
          ...base.data.manualOverride,
          ...(patch.data?.manualOverride ?? {}),
        },
      },
      ui: { ...base.ui, ...(patch.ui ?? {}) },
    };
    const validated = appSettingsSchema.parse(merged);
    this.current = validated;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(validated, null, 2), 'utf8');
    return validated;
  }

  async reset(): Promise<AppSettings> {
    this.current = defaultSettings();
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.current, null, 2), 'utf8');
    return this.current;
  }
}

export const settingsStore = new SettingsStore();
