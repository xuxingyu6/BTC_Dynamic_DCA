import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config';
import { currentMonthISO } from './capitalAllocationEngine';
import type { ReserveState } from './types';

/**
 * 加速资金池状态存储（JSON 文件，零配置）。
 *
 * 滚动管理：跨月不重置余额，上月剩余自动保留并累加本月新增。
 * 结构可扩展：未来接入 PostgreSQL 时替换为 Prisma 实现即可。
 */

export interface ReserveStateRepository {
  get(): Promise<ReserveState>;
  save(state: ReserveState): Promise<void>;
}

function defaultState(): ReserveState {
  return {
    month: currentMonthISO(),
    balance: 0,
    carryover: 0,
    monthlyAdded: 0,
    used: 0,
    deployedThisMonth: 0,
    lastDeployAt: null,
  };
}

export class ReserveStateStore implements ReserveStateRepository {
  private readonly file = path.join(config.dataDir, 'reserve-state.json');
  private cache: ReserveState | null = null;

  async get(): Promise<ReserveState> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ReserveState> & {
        initialReserve?: number;
      };
      const base = defaultState();

      // 兼容旧版本字段（initialReserve）：旧模型下该值即“本月新增池”
      const legacyReserve = Number(parsed.initialReserve) || 0;
      const legacyUsed = Number(parsed.used) || 0;
      const hasBalance = typeof parsed.balance === 'number' && Number.isFinite(parsed.balance);
      const balance = hasBalance
        ? Number(parsed.balance)
        : Math.max(0, legacyReserve - legacyUsed);
      const monthlyAdded =
        typeof parsed.monthlyAdded === 'number' && Number.isFinite(parsed.monthlyAdded)
          ? Number(parsed.monthlyAdded)
          : legacyReserve;

      this.cache = {
        month: typeof parsed.month === 'string' ? parsed.month : base.month,
        balance,
        carryover:
          typeof parsed.carryover === 'number' && Number.isFinite(parsed.carryover)
            ? Number(parsed.carryover)
            : 0,
        monthlyAdded,
        used: legacyUsed,
        deployedThisMonth: Number(parsed.deployedThisMonth) || 0,
        lastDeployAt: typeof parsed.lastDeployAt === 'string' ? parsed.lastDeployAt : null,
      };
    } catch {
      this.cache = defaultState();
    }
    return this.cache;
  }

  async save(state: ReserveState): Promise<void> {
    this.cache = state;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(state, null, 2), 'utf8');
  }

  async reset(): Promise<ReserveState> {
    const state = defaultState();
    await this.save(state);
    return state;
  }
}

export const reserveStateStore = new ReserveStateStore();
