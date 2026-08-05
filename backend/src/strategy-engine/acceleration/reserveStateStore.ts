import fs from 'fs/promises';
import path from 'path';
import { config } from '../../config';
import { getPrisma } from '../../db/prisma';
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
    monthlyAccelerationExecutions: 0,
    lastDeployAt: null,
  };
}

export class ReserveStateStore implements ReserveStateRepository {
  private readonly file = path.join(config.dataDir, 'reserve-state.json');
  private cache: ReserveState | null = null;

  /** PostgreSQL 单行表读写（id 恒为 1），失败时回退本地文件 */
  private async loadRaw(): Promise<unknown | null> {
    if (config.databaseMode === 'postgres') {
      const prisma = await getPrisma();
      if (prisma) {
        try {
          const row = await (
            prisma as unknown as {
              reserveState: {
                findUnique(args: { where: { id: number } }): Promise<{ data: unknown } | null>;
              };
            }
          ).reserveState.findUnique({ where: { id: 1 } });
          return row?.data ?? null;
        } catch (err) {
          console.warn(`[reserve] 读取 PostgreSQL 失败，回退文件: ${(err as Error).message}`);
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

  private async saveRaw(state: ReserveState): Promise<void> {
    if (config.databaseMode === 'postgres') {
      const prisma = await getPrisma();
      if (prisma) {
        await (
          prisma as unknown as {
            reserveState: {
              upsert(args: {
                where: { id: number };
                create: { id: number; data: unknown };
                update: { data: unknown };
              }): Promise<unknown>;
            };
          }
        ).reserveState.upsert({
          where: { id: 1 },
          create: { id: 1, data: state },
          update: { data: state },
        });
        return;
      }
    }
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
      // 只读文件系统（如 Vercel）下降级为进程内内存存储
      console.warn(
        `[reserve] 本地文件不可写，资金池状态仅保存在内存: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  async get(): Promise<ReserveState> {
    if (config.databaseMode !== 'postgres' && this.cache) return this.cache;
    try {
      const raw = await this.loadRaw();
      const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReserveState> & {
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
        monthlyAccelerationExecutions: Number(parsed.monthlyAccelerationExecutions) || 0,
        lastDeployAt: typeof parsed.lastDeployAt === 'string' ? parsed.lastDeployAt : null,
      };
    } catch {
      this.cache = defaultState();
    }
    return this.cache;
  }

  async save(state: ReserveState): Promise<void> {
    this.cache = state;
    await this.saveRaw(state);
  }

  async reset(): Promise<ReserveState> {
    const state = defaultState();
    await this.save(state);
    return state;
  }
}

export const reserveStateStore = new ReserveStateStore();
