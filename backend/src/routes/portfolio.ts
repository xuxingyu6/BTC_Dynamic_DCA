import { Router } from 'express';
import { settingsStore } from '../settings/settingsStore';
import { marketDataService } from '../services/marketDataService';
import { computePortfolioStats } from '../utils/portfolio';

/**
 * BTC 持仓路由：
 *   GET /api/portfolio   持仓输入 + 自动计算的收益统计（当前价格）
 *   PUT /api/portfolio   更新 BTC 持有数量 / 累计投入金额
 */

export const portfolioRouter = Router();

portfolioRouter.get('/portfolio', async (_req, res, next) => {
  try {
    const settings = await settingsStore.get();
    const snapshot = await marketDataService.getSnapshot();
    res.json(computePortfolioStats(settings.portfolio, snapshot.price));
  } catch (err) {
    next(err);
  }
});

portfolioRouter.put('/portfolio', async (req, res, next) => {
  try {
    const settings = await settingsStore.update({ portfolio: req.body ?? {} });
    const snapshot = await marketDataService.getSnapshot();
    res.json(computePortfolioStats(settings.portfolio, snapshot.price));
  } catch (err) {
    next(err);
  }
});
