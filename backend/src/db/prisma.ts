import { config } from '../config';

type PrismaClient = import('@prisma/client').PrismaClient;

let clientPromise: Promise<PrismaClient | null> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`PostgreSQL 连接超时 (${ms}ms)`)), ms)
    ),
  ]);
}

/**
 * 生产数据库表结构（幂等，兼容 Vercel 冷启动 / 全新 Neon 库）。
 * 与 prisma/migrations 保持同一结构；migrate deploy 已建表时直接跳过。
 */
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "investment_records" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "marketState" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'manual',
    "riskLevel" INTEGER,
    "triggeredIndicators" INTEGER,
    "remainingReserve" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "investment_records_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "investment_records_date_idx" ON "investment_records"("date")`,
  `CREATE TABLE IF NOT EXISTS "app_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "reserve_state" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reserve_state_pkey" PRIMARY KEY ("id")
  )`,
];

async function ensureSchema(client: PrismaClient): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) {
    await withTimeout(client.$executeRawUnsafe(sql), 15_000);
  }
}

/**
 * 全局共享的 Prisma 客户端（懒加载 + 连接超时保护）。
 * - DATABASE_MODE=postgres 且连接成功：返回客户端（并确认表结构存在）
 * - 否则返回 null，调用方回退到本地 JSON 文件存储
 */
export function getPrisma(): Promise<PrismaClient | null> {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (config.databaseMode !== 'postgres') return null;
      try {
        const { PrismaClient } = await import('@prisma/client');
        const client = new PrismaClient();
        await withTimeout(client.$queryRaw`SELECT 1`, 2500);
        await ensureSchema(client);
        console.log('[db] PostgreSQL 已连接，表结构已确认');
        return client;
      } catch (err) {
        console.warn(
          `[db] PostgreSQL 不可用，回退到文件存储: ${err instanceof Error ? err.message : String(err)}`
        );
        return null;
      }
    })();
  }
  return clientPromise;
}
