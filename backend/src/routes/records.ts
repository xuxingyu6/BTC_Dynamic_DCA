import { Router } from 'express';
import { z } from 'zod';
import { getRecordRepository } from '../db/recordsRepository';

/**
 * 投资记录路由（CRUD）：
 *   GET    /api/records
 *   POST   /api/records
 *   PUT    /api/records/:id
 *   DELETE /api/records/:id
 */

const recordInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  price: z.number().positive().nullable().optional(),
  amount: z.number().positive('投入金额必须大于 0'),
  quantity: z.number().nonnegative().nullable().optional(),
  marketState: z.string().max(60).nullable().optional(),
  transactionType: z.enum(['core', 'acceleration', 'manual']).nullable().optional(),
  riskLevel: z.number().int().min(0).max(3).nullable().optional(),
  triggeredIndicators: z.number().int().min(0).max(3).nullable().optional(),
  remainingReserve: z.number().nonnegative().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const recordsRouter = Router();

recordsRouter.get('/records', async (_req, res, next) => {
  try {
    const repo = await getRecordRepository();
    res.json({ records: await repo.list() });
  } catch (err) {
    next(err);
  }
});

recordsRouter.post('/records', async (req, res, next) => {
  try {
    const parsed = recordInputSchema.parse(req.body);
    const price = parsed.price ?? 0;
    const quantity = parsed.quantity ?? (price > 0 ? parsed.amount / price : 0);
    const repo = await getRecordRepository();
    const record = await repo.create({
      ...parsed,
      price,
      quantity,
    });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

recordsRouter.put('/records/:id', async (req, res, next) => {
  try {
    const parsed = recordInputSchema.parse(req.body);
    const price = parsed.price ?? 0;
    const quantity = parsed.quantity ?? (price > 0 ? parsed.amount / price : 0);
    const repo = await getRecordRepository();
    const record = await repo.update(req.params.id, { ...parsed, price, quantity });
    if (!record) return res.status(404).json({ error: '记录不存在' });
    res.json(record);
  } catch (err) {
    next(err);
  }
});

recordsRouter.delete('/records/:id', async (req, res, next) => {
  try {
    const repo = await getRecordRepository();
    const ok = await repo.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: '记录不存在' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
