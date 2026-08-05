import { Moon, RefreshCw, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { fmtDateTime } from '@/utils/format';

const TITLES: Record<string, string> = {
  '/': '市场总览',
  '/simulator': '回测模拟',
  '/records': '投资记录',
  '/settings': '参数设置',
};

export function TopBar({
  dataSource,
  updatedAt,
  refreshing,
  onRefresh,
}: {
  dataSource: 'live' | 'demo' | 'mixed' | null;
  updatedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? '市场总览';
  const { resolved, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-bg/70 px-5 py-3.5 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500">
            <span className="text-sm font-black text-slate-950">₿</span>
          </span>
        </div>
        <h1 className="text-base font-semibold tracking-wide text-primary md:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="hidden text-[11px] text-muted sm:block">
          {updatedAt ? `更新于 ${fmtDateTime(updatedAt)}` : '等待数据…'}
        </span>
        {dataSource === 'live' ? (
          <Badge tone="green" dot="bg-emerald-400" className="hidden sm:inline-flex">
            实时
          </Badge>
        ) : dataSource === 'demo' ? (
          <Badge tone="amber" dot="bg-amber-400" className="hidden sm:inline-flex">
            演示
          </Badge>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggle}
          title={resolved === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          className="hidden sm:inline-flex"
        >
          {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={toggle} className="sm:hidden" title="切换主题">
          {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="secondary" onClick={onRefresh} loading={refreshing} title="刷新数据">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">刷新</span>
        </Button>
      </div>
    </header>
  );
}
