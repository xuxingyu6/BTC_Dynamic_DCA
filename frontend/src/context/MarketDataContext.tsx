import { createContext, useContext, type ReactNode } from 'react';
import { useMarketData } from '@/hooks/useMarketData';

/** 全局市场数据（AppShell 持有，页面共享，避免重复轮询） */

export interface MarketDataValue {
  data: ReturnType<typeof useMarketData>['data'];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MarketDataContext = createContext<MarketDataValue | null>(null);

export function MarketDataProvider({
  refreshIntervalSec,
  children,
}: {
  refreshIntervalSec: number;
  children: ReactNode;
}) {
  const { data, loading, refreshing, error, refresh } = useMarketData(refreshIntervalSec);
  return (
    <MarketDataContext.Provider value={{ data, loading, refreshing, error, refresh }}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarket(): MarketDataValue {
  const ctx = useContext(MarketDataContext);
  if (!ctx) throw new Error('useMarket 必须在 MarketDataProvider 内使用');
  return ctx;
}
