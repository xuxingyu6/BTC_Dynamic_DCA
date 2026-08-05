import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const base =
  'w-full rounded-lg border border-line-strong bg-inset px-3 py-2 text-sm text-primary placeholder:text-faint outline-none transition-colors focus:border-accent/60 focus:bg-hover';

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(base, className)} {...rest} />;
  }
);

export const NumberInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NumberInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="number"
        step="any"
        className={cn(base, 'font-mono tnum', className)}
        {...rest}
      />
    );
  }
);

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(base, 'cursor-pointer', className)} {...rest}>
        {children}
      </select>
    );
  }
);

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}
