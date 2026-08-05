import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { config } from './config';
import { healthRouter } from './routes/health';
import { marketRouter } from './routes/market';
import { backtestRouter } from './routes/backtest';
import { recordsRouter } from './routes/records';
import { settingsRouter } from './routes/settings';
import { reserveRouter } from './routes/reserve';

export const app = express();

app.use(
  cors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api', healthRouter);
app.use('/api', marketRouter);
app.use('/api', backtestRouter);
app.use('/api', recordsRouter);
app.use('/api', settingsRouter);
app.use('/api', reserveRouter);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// 统一错误处理
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues.map((i) => i.message).join('；') });
  }
  const message = err instanceof Error ? err.message : '服务器内部错误';
  console.error('[api]', message);
  res.status(500).json({ error: message });
});
