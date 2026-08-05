import { LayoutDashboard, LineChart, BookOpen, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useSettings } from '@/context/SettingsContext';
import { MarketDataProvider, useMarket } from '@/context/MarketDataContext';
import { cn } from '@/utils/cn';

const MOBILE_NAV = [
  { to: '/', label: '总览', icon: LayoutDashboard, end: true },
  { to: '/simulator', label: '回测', icon: LineChart, end: false },
  { to: '/records', label: '记录', icon: BookOpen, end: false },
  { to: '/settings', label: '设置', icon: Settings, end: false },
];

export function AppShell() {
  const { settings } = useSettings();
  const refreshInterval = settings?.ui.refreshIntervalSec ?? 300;

  return (
    <MarketDataProvider refreshIntervalSec={refreshInterval}>
      <ShellInner />
    </MarketDataProvider>
  );
}

function ShellInner() {
  const { data, refreshing, refresh } = useMarket();
  return (
    <div className="min-h-screen">
      <Sidebar dataSource={data?.source ?? null} />
      <div className="md:pl-60">
        <TopBar
          dataSource={data?.source ?? null}
          updatedAt={data?.updatedAt ?? null}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
        />

        <main className="grid-bg min-h-[calc(100vh-60px)] px-5 pb-24 pt-6 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* 移动端底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur-xl md:hidden">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
                isActive ? 'text-accent' : 'text-muted'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
