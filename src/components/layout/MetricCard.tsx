import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "positive" | "negative" | "warning" | "success";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: number; suffix?: string } | null;
  icon?: LucideIcon;
  tone?: MetricTone;
  hint?: string;
  className?: string;
  onClick?: () => void;
}

const toneIcon: Record<MetricTone, string> = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  positive: "bg-blue-50 text-blue-600 border-blue-200",
  negative: "bg-red-50 text-red-600 border-red-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/**
 * Compact KPI card. Use in rows of 2–4 for indicators
 * (Entradas, Saídas, CMV, Lucro, Falhas, Execuções...).
 */
export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "neutral",
  hint,
  className,
  onClick,
}: MetricCardProps) {
  const isInteractive = !!onClick;
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl bg-white border border-slate-200/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "transition-all",
        isInteractive && "cursor-pointer hover:border-slate-300 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.15)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {label}
          </p>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900 truncate">
            {value}
          </div>
          {(delta || hint) && (
            <div className="mt-1.5 flex items-center gap-2 text-[12px]">
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-semibold tabular-nums",
                    delta.value >= 0 ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {delta.value >= 0 ? "▲" : "▼"}
                  {Math.abs(delta.value).toFixed(1)}
                  {delta.suffix ?? "%"}
                </span>
              )}
              {hint && <span className="text-slate-500">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "shrink-0 h-9 w-9 rounded-xl border inline-flex items-center justify-center",
              toneIcon[tone]
            )}
          >
            <Icon size={16} strokeWidth={2.2} />
          </div>
        )}
      </div>
    </div>
  );
}
