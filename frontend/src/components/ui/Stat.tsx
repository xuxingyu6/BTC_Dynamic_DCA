import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Stat({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-line bg-inset px-4 py-3', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-lg font-semibold tnum text-primary',
          accent && 'text-glow text-accent'
        )}
      >
        {value}
      </p>
      {sub && <div className="mt-0.5 text-[11px] text-faint">{sub}</div>}
    </div>
  );
}
