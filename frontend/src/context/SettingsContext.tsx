import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/services/api';
import type { AppSettings } from '@/types';

interface SettingsContextValue {
  settings: AppSettings | null;
  loading: boolean;
  save: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  reset: () => Promise<AppSettings>;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('加载设置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (patch: Partial<AppSettings>) => {
    const updated = await api.updateSettings(patch);
    setSettings(updated);
    return updated;
  }, []);

  const reset = useCallback(async () => {
    const updated = await api.resetSettings();
    setSettings(updated);
    return updated;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, save, reset, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings 必须在 SettingsProvider 内使用');
  return ctx;
}
