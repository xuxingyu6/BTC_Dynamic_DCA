import { Router } from 'express';
import { settingsStore } from '../settings/settingsStore';

/**
 * 设置路由：
 *   GET  /api/settings
 *   PUT  /api/settings
 *   POST /api/settings/reset
 */

export const settingsRouter = Router();

settingsRouter.get('/settings', async (_req, res, next) => {
  try {
    res.json(await settingsStore.get());
  } catch (err) {
    next(err);
  }
});

settingsRouter.put('/settings', async (req, res, next) => {
  try {
    res.json(await settingsStore.update(req.body ?? {}));
  } catch (err) {
    next(err);
  }
});

settingsRouter.post('/settings/reset', async (_req, res, next) => {
  try {
    res.json(await settingsStore.reset());
  } catch (err) {
    next(err);
  }
});
