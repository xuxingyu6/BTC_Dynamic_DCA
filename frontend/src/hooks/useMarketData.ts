import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import type { IndicatorsResponse } from '@/types';

/**
 * Dashboard 市场数据 Hook：
 * 初始加载 + 按设置周期轮询 + 手动刷新。
 */
export function useMarketData(refreshIntervalSec: number) {
  const [data, setData] = useState<IndicatorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (force) setRefreshing(true);
    try {
      const result = await api.getIndicators(force);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      busyRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(false), refreshIntervalSec * 1000);
    return () => clearInterval(id);
  }, [load, refreshIntervalSec]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
  };
}
