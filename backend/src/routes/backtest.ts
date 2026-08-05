import { Router } from 'express';
import { z } from 'zod';
import { marketDataService } from '../services/marketDataService';
import { runBacktest } from '../backtest/backtestEngine';

/**
 * 回测路由：
 *   POST /api/backtest
 */

const backtestSchema = z.object({
  asset: z.enum(['btc']).default('btc'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '开始日期格式应为 YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '结束日期格式应为 YYYY-MM-DD'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  baseAmount: z.number().min(1).max(1_000_000),
  level1Amount: z.number().min(0).max(1_000_000),
  level2Amount: z.number().min(0).max(1_000_000),
  level3Amount: z.number().min(0).max(1_000_000),
  ma200Multiplier: z.number().min(1).max(2),
  mvrvThreshold: z.number().min(0).max(2),
  puellThreshold: z.number().min(0).max(2),
  feeRatePct: z.number().min(0).max(5),
});

export const backtestRouter = Router();

backtestRouter.post('/backtest', async (req, res, next) => {
  try {
    const parsed = backtestSchema.parse(req.body);
    const { bars, source } = await marketDataService.getHistory();
    const dataSource = source === 'live' ? 'CoinMetrics + CoinGecko 实时数据' : '演示数据（Demo）';
    res.json(runBacktest(parsed, bars, dataSource));
  } catch (err) {
    next(err);
  }
});
