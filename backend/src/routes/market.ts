import { Router } from 'express';
import { marketDataService } from '../services/marketDataService';
import { getSupportedAssets } from '../strategy-engine/registry';

/**
 * 市场数据路由：
 *   GET /api/btc-price   当前价格快照
 *   GET /api/200w-ma     MA200W 指标
 *   GET /api/mvrv        MVRV 指标
 *   GET /api/puell       Puell 指标
 *   GET /api/indicators  聚合市场状态 + 策略结果（Dashboard 主接口）
 *   GET /api/history     历史图表数据
 *   GET /api/assets      支持的资产（扩展性展示）
 *   POST /api/refresh    手动刷新数据
 */

export const marketRouter = Router();

function forceOf(query: Record<string, unknown>): boolean {
  return query.refresh === '1' || query.refresh === 'true';
}

marketRouter.get('/btc-price', async (req, res, next) => {
  try {
    res.json(await marketDataService.getSnapshot(forceOf(req.query as Record<string, unknown>)));
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/200w-ma', async (req, res, next) => {
  try {
    const data = await marketDataService.getSingleIndicator('ma200w', forceOf(req.query as Record<string, unknown>));
    if (!data) return res.status(404).json({ error: '指标不存在' });
    res.json({
      price: data.detail.price,
      ma200w: data.value,
      distancePct: data.detail.distancePct,
      threshold: data.threshold,
      zone: data.zone,
      triggered: data.triggered,
      source: data.source,
      updatedAt: data.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/mvrv', async (req, res, next) => {
  try {
    const data = await marketDataService.getSingleIndicator('mvrv', forceOf(req.query as Record<string, unknown>));
    if (!data) return res.status(404).json({ error: '指标不存在' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/puell', async (req, res, next) => {
  try {
    const data = await marketDataService.getSingleIndicator('puell', forceOf(req.query as Record<string, unknown>));
    if (!data) return res.status(404).json({ error: '指标不存在' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/indicators', async (req, res, next) => {
  try {
    res.json(await marketDataService.getIndicatorsSnapshot(forceOf(req.query as Record<string, unknown>)));
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/history', async (req, res, next) => {
  try {
    const days = Math.min(3650, Math.max(30, Number((req.query as Record<string, unknown>).days ?? 730)));
    res.json(await marketDataService.getHistoryPoints(days, forceOf(req.query as Record<string, unknown>)));
  } catch (err) {
    next(err);
  }
});

marketRouter.get('/assets', (_req, res) => {
  res.json({ assets: getSupportedAssets() });
});

marketRouter.post('/refresh', async (_req, res, next) => {
  try {
    const result = await marketDataService.refresh();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});
