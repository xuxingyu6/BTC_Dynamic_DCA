import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-accent', className)} />;
}

export function LoadingBlock({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="h-7 w-7" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="text-sm text-down">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-line-strong px-4 py-1.5 text-xs text-secondary hover:bg-inset"
        >
          重试
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="text-sm text-muted">{title}</p>
      {subtitle && <p className="max-w-sm text-xs text-faint">{subtitle}</p>}
    </div>
  );
}
