import { Bitcoin, BookOpen, LineChart, Settings, SlidersHorizontal } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/Badge';

const NAV_ITEMS = [
  { to: '/', label: '总览', icon: SlidersHorizontal, end: true },
  { to: '/simulator', label: '回测模拟', icon: LineChart, end: false },
  { to: '/records', label: '投资记录', icon: BookOpen, end: false },
  { to: '/settings', label: '参数设置', icon: Settings, end: false },
];

export function Sidebar({ dataSource }: { dataSource: 'live' | 'demo' | 'mixed' | null }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface/75 backdrop-blur-xl md:flex">
      {/* 品牌 */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_24px_rgb(34_211_238/0.35)]">
          <Bitcoin className="h-6 w-6 text-slate-950" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-primary">BTC 动态混合定投</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent/80">
            Dynamic DCA
          </p>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-inset hover:text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_var(--glow-strong)]" />
                )}
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 底部状态 */}
      <div className="space-y-2 border-t border-line px-5 py-4">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>数据源</span>
          {dataSource === 'live' ? (
            <Badge tone="green" dot="bg-emerald-400">
              实时数据
            </Badge>
          ) : dataSource === 'demo' ? (
            <Badge tone="amber" dot="bg-amber-400">
              演示数据
            </Badge>
          ) : (
            <Badge tone="slate" dot="bg-slate-400">
              连接中
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-faint">v1.0.0 · 投资有风险，数据仅供参考</p>
      </div>
    </aside>
  );
}
