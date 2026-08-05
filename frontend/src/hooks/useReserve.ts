import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { ReserveDeployResult, ReserveStatus } from '@/types';

/**
 * 加速资金状态 Hook：加载资金池状态 + 执行释放 + 重置。
 * 随 Dashboard 市场数据一起刷新（手动刷新时同时重载）。
 */
export function useReserve() {
  const [data, setData] = useState<ReserveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const status = await api.getReserve();
      setData(status);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '加速资金状态加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deploy = useCallback(async (): Promise<ReserveDeployResult | null> => {
    setDeploying(true);
    try {
      const result = await api.deployReserve();
      setMessage(
        result.result.deployed
          ? `已释放 $${result.result.actualAmount}（Level ${result.level}）`
          : result.result.status === 'exhausted'
            ? '加速资金已耗尽，暂不执行'
            : result.result.status === 'month-limit-reached'
              ? '本月释放额度已用完'
              : '当前无加速机会'
      );
      await load();
      return result;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '释放失败');
      return null;
    } finally {
      setDeploying(false);
    }
  }, [load]);

  const resetMonth = useCallback(async () => {
    await api.resetReserve();
    setMessage('资金池已重置');
    await load();
  }, [load]);

  return { data, loading, deploying, message, deploy, resetMonth, reload: load };
}
