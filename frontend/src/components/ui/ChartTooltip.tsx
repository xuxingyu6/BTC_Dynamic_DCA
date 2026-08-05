/** Recharts 深色 Tooltip（供多个图表复用） */

export function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] rounded-lg border border-line-strong bg-panel p-3 shadow-xl backdrop-blur">
      <p className="mb-2 font-mono text-[11px] text-muted">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ background: entry.color || entry.fill }} />
              {entry.name}
            </span>
            <span className="font-mono tnum text-primary">
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
