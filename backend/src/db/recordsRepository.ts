import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

/**
 * 投资记录仓储。
 *
 * 采用仓储模式：默认使用本地 JSON 文件（零配置），
 * 当 DATABASE_MODE=postgres 且 PostgreSQL 可用时自动切换到 Prisma 实现。
 */

export interface InvestmentRecord {
  id: string;
  date: string; // YYYY-MM-DD
  price: number;
  amount: number;
  quantity: number;
  marketState: string;
  /** 交易类型：core（底仓定投）/ acceleration（加速买入）/ manual（手动记录） */
  transactionType: string;
  riskLevel: number | null;
  triggeredIndicators: number | null;
  remainingReserve: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordInput {
  date: string;
  price?: number | null;
  amount: number;
  quantity?: number | null;
  marketState?: string | null;
  transactionType?: string | null;
  riskLevel?: number | null;
  triggeredIndicators?: number | null;
  remainingReserve?: number | null;
  note?: string | null;
}

export interface RecordRepository {
  list(): Promise<InvestmentRecord[]>;
  create(input: RecordInput): Promise<InvestmentRecord>;
  update(id: string, input: RecordInput): Promise<InvestmentRecord | null>;
  remove(id: string): Promise<boolean>;
}

// ---------------------------------------------------------------- 文件实现

class FileRecordRepository implements RecordRepository {
  private records: InvestmentRecord[] | null = null;
  private readonly file = path.join(config.dataDir, 'records.json');

  private async load(): Promise<InvestmentRecord[]> {
    if (this.records) return this.records;
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      this.records = JSON.parse(raw) as InvestmentRecord[];
    } catch {
      this.records = [];
    }
    return this.records;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.records ?? [], null, 2), 'utf8');
  }

  async list(): Promise<InvestmentRecord[]> {
    const all = await this.load();
    return [...all].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: RecordInput): Promise<InvestmentRecord> {
    const all = await this.load();
    const now = new Date().toISOString();
    const record: InvestmentRecord = {
      id: randomUUID(),
      date: input.date,
      price: input.price ?? 0,
      amount: input.amount,
      quantity: input.quantity ?? 0,
      marketState: input.marketState ?? 'unknown',
      transactionType: input.transactionType ?? 'manual',
      riskLevel: input.riskLevel ?? null,
      triggeredIndicators: input.triggeredIndicators ?? null,
      remainingReserve: input.remainingReserve ?? null,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };
    all.push(record);
    await this.save();
    return record;
  }

  async update(id: string, input: RecordInput): Promise<InvestmentRecord | null> {
    const all = await this.load();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const prev = all[idx];
    const next: InvestmentRecord = {
      ...prev,
      date: input.date,
      price: input.price ?? prev.price,
      amount: input.amount,
      quantity: input.quantity ?? prev.quantity,
      marketState: input.marketState ?? prev.marketState,
      transactionType: input.transactionType ?? prev.transactionType,
      riskLevel: input.riskLevel ?? prev.riskLevel,
      triggeredIndicators: input.triggeredIndicators ?? prev.triggeredIndicators,
      remainingReserve: input.remainingReserve ?? prev.remainingReserve,
      note: input.note ?? prev.note,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = next;
    await this.save();
    return next;
  }

  async remove(id: string): Promise<boolean> {
    const all = await this.load();
    const before = all.length;
    this.records = all.filter((r) => r.id !== id);
    await this.save();
    return this.records.length < before;
  }
}

// ---------------------------------------------------------------- Prisma 实现

interface PrismaLike {
  investmentRecord: {
    findMany(): Promise<unknown[]>;
    create(data: unknown): Promise<unknown>;
    update(args: { where: { id: string }; data: unknown }): Promise<unknown>;
    delete(args: { where: { id: string } }): Promise<unknown>;
  };
}

/** Prisma 返回的记录行结构 */
interface PrismaRecordRow {
  id: string;
  date: Date;
  price: number;
  amount: number;
  quantity: number;
  marketState: string;
  transactionType: string;
  riskLevel: number | null;
  triggeredIndicators: number | null;
  remainingReserve: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

class PrismaRecordRepository implements RecordRepository {
  constructor(private readonly client: PrismaLike) {}

  private map(r: PrismaRecordRow): InvestmentRecord {
    return {
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      price: r.price,
      amount: r.amount,
      quantity: r.quantity,
      marketState: r.marketState,
      transactionType: r.transactionType,
      riskLevel: r.riskLevel,
      triggeredIndicators: r.triggeredIndicators,
      remainingReserve: r.remainingReserve,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async list(): Promise<InvestmentRecord[]> {
    const rows = (await this.client.investmentRecord.findMany()) as PrismaRecordRow[];
    return rows.map((r) => this.map(r)).sort((a, b) => b.date.localeCompare(a.date));
  }

  async create(input: RecordInput): Promise<InvestmentRecord> {
    const row = (await this.client.investmentRecord.create({
      data: {
        date: new Date(`${input.date}T00:00:00.000Z`),
        price: input.price ?? 0,
        amount: input.amount,
        quantity: input.quantity ?? 0,
        marketState: input.marketState ?? 'unknown',
        transactionType: input.transactionType ?? 'manual',
        riskLevel: input.riskLevel ?? null,
        triggeredIndicators: input.triggeredIndicators ?? null,
        remainingReserve: input.remainingReserve ?? null,
        note: input.note ?? null,
      },
    })) as PrismaRecordRow;
    return this.map(row);
  }

  async update(id: string, input: RecordInput): Promise<InvestmentRecord | null> {
    try {
      const row = (await this.client.investmentRecord.update({
        where: { id },
        data: {
          date: new Date(`${input.date}T00:00:00.000Z`),
          price: input.price ?? undefined,
          amount: input.amount,
          quantity: input.quantity ?? undefined,
          marketState: input.marketState ?? undefined,
          transactionType: input.transactionType ?? undefined,
          riskLevel: input.riskLevel ?? undefined,
          triggeredIndicators: input.triggeredIndicators ?? undefined,
          remainingReserve: input.remainingReserve ?? undefined,
          note: input.note ?? undefined,
        },
      })) as PrismaRecordRow;
      return this.map(row);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.client.investmentRecord.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------- 工厂

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function tryCreatePrisma(): Promise<PrismaRecordRepository | null> {
  if (config.databaseMode !== 'postgres') return null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    const client = new PrismaClient();
    await withTimeout(client.$queryRaw`SELECT 1`, 2500);
    return new PrismaRecordRepository(client as unknown as PrismaLike);
  } catch (err) {
    console.warn(`[db] PostgreSQL 不可用，回退到文件存储: ${(err as Error).message}`);
    return null;
  }
}

let repoPromise: Promise<RecordRepository> | null = null;

export function getRecordRepository(): Promise<RecordRepository> {
  if (!repoPromise) {
    repoPromise = (async () => {
      const prisma = await tryCreatePrisma();
      if (prisma) {
        console.log('[db] 使用 PostgreSQL + Prisma 存储投资记录');
        return prisma;
      }
      console.log('[db] 使用本地 JSON 文件存储投资记录');
      return new FileRecordRepository();
    })();
  }
  return repoPromise;
}
