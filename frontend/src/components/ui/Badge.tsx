import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BadgeTone = 'default' | 'green' | 'red' | 'amber' | 'cyan' | 'violet' | 'slate';

const TONES: Record<BadgeTone, string> = {
  default: 'bg-inset text-secondary border-line',
  green: 'bg-up/10 text-up border-up/25',
  red: 'bg-down/10 text-down border-down/25',
  amber: 'bg-warn/10 text-warn border-warn/25',
  cyan: 'bg-accent/10 text-accent border-accent/25',
  violet: 'bg-violet/10 text-violet border-violet/25',
  slate: 'bg-inset text-muted border-line-strong',
};

export function Badge({
  children,
  tone = 'default',
  className,
  dot,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}
