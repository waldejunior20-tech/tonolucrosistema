import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Campo "stacked" estilo Meta/Facebook:
 *   ┌──────────────────────────┐
 *   │ Label pequeno em cima    │
 *   │ Valor maior embaixo      │
 *   └──────────────────────────┘
 *
 * Envolva qualquer Input/SmartInput. O wrapper neutraliza a borda/altura
 * do filho via seletores CSS, então funciona com Input, SmartMoneyInput,
 * PercentInput, IntegerInput, etc.
 *
 * Uso:
 *   <FloatingField label="Endereço">
 *     <Input value={...} onChange={...} />
 *   </FloatingField>
 */
interface FloatingFieldProps {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FloatingField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: FloatingFieldProps) {
  return (
    <div className="space-y-1">
      <div
        className={cn(
          // Container bordered "card-input"
          "group relative rounded-xl border bg-white px-4 pt-2 pb-1.5 transition-colors",
          "border-slate-200 hover:border-slate-300",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/15",
          // Neutralize child inputs
          "[&_input]:h-7 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0",
          "[&_input]:text-base [&_input]:font-semibold [&_input]:text-slate-900",
          "[&_input]:shadow-none [&_input]:rounded-none",
          "[&_input:focus-visible]:ring-0 [&_input:focus-visible]:border-0",
          // Affixes (R$ / %) — re-anchor to the inner row
          "[&_input.pl-9]:pl-7",
          "[&_input.pr-8]:pr-6",
          className,
        )}
      >
        <label
          htmlFor={htmlFor}
          className="block text-[11px] font-medium uppercase tracking-wide text-slate-500"
        >
          {label}
        </label>
        <div className="relative">{children}</div>
      </div>
      {hint && !error && (
        <p className="px-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="px-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
