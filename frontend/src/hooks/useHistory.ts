import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { HistoryResponse } from '@/types';

/** 历史图表数据 Hook（价格 + MA200W） */
export function useHistory(days: number) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.getHistory(days));
    } catch (err) {
      console.error('历史数据加载失败:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}
