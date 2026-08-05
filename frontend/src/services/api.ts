import type {
  AppSettings,
  BacktestRequest,
  BacktestResponse,
  HistoryResponse,
  IndicatorsResponse,
  InvestmentRecord,
  PortfolioStatus,
  RecordInput,
  ReserveDeployResult,
  ReserveStatus,
} from '@/types';

/** API 客户端：统一错误处理与 JSON 序列化 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* 非 JSON 响应 */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  getIndicators: (refresh = false) =>
    request<IndicatorsResponse>(`/api/indicators${refresh ? '?refresh=1' : ''}`),

  getHistory: (days = 730) =>
    request<HistoryResponse>(`/api/history?days=${days}`),

  runBacktest: (body: BacktestRequest) =>
    request<BacktestResponse>('/api/backtest', { method: 'POST', body: JSON.stringify(body) }),

  getRecords: () => request<{ records: InvestmentRecord[] }>('/api/records'),

  createRecord: (body: RecordInput) =>
    request<InvestmentRecord>('/api/records', { method: 'POST', body: JSON.stringify(body) }),

  updateRecord: (id: string, body: RecordInput) =>
    request<InvestmentRecord>(`/api/records/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteRecord: (id: string) =>
    request<{ ok: boolean }>(`/api/records/${id}`, { method: 'DELETE' }),

  getSettings: () => request<AppSettings>('/api/settings'),

  updateSettings: (patch: Partial<AppSettings>) =>
    request<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) }),

  resetSettings: () =>
    request<AppSettings>('/api/settings/reset', { method: 'POST' }),

  refresh: () => request<{ ok: boolean; source: string | null }>('/api/refresh', { method: 'POST' }),

  getReserve: () => request<ReserveStatus>('/api/reserve'),

  deployReserve: () =>
    request<ReserveDeployResult>('/api/reserve/deploy', { method: 'POST' }),

  resetReserve: () =>
    request<{ ok: boolean }>('/api/reserve/reset', { method: 'POST' }),

  getPortfolio: () => request<PortfolioStatus>('/api/portfolio'),

  updatePortfolio: (body: { mode?: 'manual' | 'records'; btcAmount: number; avgCost: number }) =>
    request<PortfolioStatus>('/api/portfolio', { method: 'PUT', body: JSON.stringify(body) }),
};
