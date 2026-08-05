import { CheckCircle2 } from 'lucide-react';

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-8">
      <div className="flex items-center gap-2 rounded-xl border border-up/30 bg-panel px-4 py-2.5 text-sm text-up shadow-2xl backdrop-blur">
        <CheckCircle2 className="h-4 w-4" />
        {message}
      </div>
    </div>
  );
}
