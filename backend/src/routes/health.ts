import { Router } from 'express';
import { config } from '../config';
import { marketDataService } from '../services/marketDataService';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'btc-dynamic-dca-backend',
    version: '1.0.0',
    time: new Date().toISOString(),
    databaseMode: config.databaseMode,
    dataSource: marketDataService.dataSource ?? 'pending',
  });
});
