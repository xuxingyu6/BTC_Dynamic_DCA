import path from 'path';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

/**
 * 全局配置。
 * 全部环境变量可覆盖，默认值保证开箱即用（无需任何 API Key）。
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  /** 运行数据目录：缓存 / 设置 / 投资记录（文件模式） */
  dataDir: path.resolve(
    process.env.DATA_DIR ??
      (process.env.NODE_ENV === 'production'
        ? path.join(os.tmpdir(), 'btc-dca-data')
        : path.join(__dirname, '..', 'data'))
  ),

  /** 存储模式：file（零配置） | postgres（Prisma） */
  databaseMode: (process.env.DATABASE_MODE ?? 'file') as 'file' | 'postgres',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://btc_dca:btc_dca@localhost:5432/btc_dca',

  /** 缓存 TTL */
  cache: {
    snapshotTtlMs: 60_000, // 价格快照 1 分钟
    historyTtlMs: 6 * 3_600_000, // 历史日线 6 小时
    onchainTtlMs: 12 * 3_600_000, // 链上数据（MVRV/Puell）12 小时
  },

  /** 数据源地址 */
  coingeckoUrl: process.env.COINGECKO_API_URL ?? 'https://api.coingecko.com/api/v3',
  coinmetricsUrl:
    process.env.COINMETRICS_API_URL ?? 'https://community-api.coinmetrics.io/v4',

  /** Bitbo（可选）：配置 BITBO_API_KEY 后，MVRV / Puell / MA200W 使用 Bitbo 真实数据 */
  bitboUrl: process.env.BITBO_API_URL ?? 'https://charts.bitbo.io/api/v1',
  bitboApiKey: process.env.BITBO_API_KEY ?? '',

  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
} as const;
