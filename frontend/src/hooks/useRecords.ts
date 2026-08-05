import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { InvestmentRecord, RecordInput } from '@/types';

export function useRecords() {
  const [records, setRecords] = useState<InvestmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await api.getRecords();
      setRecords(data.records);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '记录加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(async (input: RecordInput) => {
    const record = await api.createRecord(input);
    setRecords((prev) => [record, ...prev]);
    return record;
  }, []);

  const update = useCallback(async (id: string, input: RecordInput) => {
    const record = await api.updateRecord(id, input);
    setRecords((prev) => prev.map((r) => (r.id === id ? record : r)));
    return record;
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { records, loading, error, reload, create, update, remove };
}
