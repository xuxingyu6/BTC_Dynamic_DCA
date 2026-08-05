import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { PortfolioStatus } from '@/types';

/**
 * BTC 持仓 Hook：加载持仓输入与自动计算的收益统计。
 */
export function usePortfolio() {
  const [data, setData] = useState<PortfolioStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const status = await api.getPortfolio();
      setData(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '持仓状态加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
