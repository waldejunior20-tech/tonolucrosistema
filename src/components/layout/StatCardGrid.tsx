import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StatTone = "neutral" | "up" | "down" | "warn";

const TONE_COLOR: Record<StatTone, string> = {
  neutral: "text-slate-900",
  up: "text-emerald-600",
  down: "text-rose-600",
  warn: "text-amber-600",
};

type StatCardProps = {
  label: string;
  value: number | ReactNode;
  unit?: "BRL" | "PERCENT";
  icon?: LucideIcon;
  tone?: StatTone;
  onClick?: () => void;
};

export function StatCard({
  label,
  value,
  unit = "BRL",
  icon: Icon,
  tone = "neutral",
  onClick,
}: StatCardProps) {
  const isInteractive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={cn(
        "rounded-xl border border-slate-100 bg-white p-4 flex flex-col gap-1.5 transition-all",
        isInteractive && "cursor-pointer hover:border-slate-200 hover:shadow-sm",
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className={TONE_COLOR[tone]} strokeWidth={2.25} />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          {label}
        </span>
      </div>
      {typeof value === "number" ? (
        <Money
          value={value}
          unit={unit}
          symbolScale={0.55}
          className={cn("text-[22px] leading-tight", TONE_COLOR[tone])}
        />
      ) : (
        <div className={cn("text-[22px] leading-tight text-finance-mono font-semibold", TONE_COLOR[tone])}>
          {value}
        </div>
      )}
    </div>
  );
}

type GridProps = {
  children: ReactNode;
  /** Quantidade de colunas no desktop (lg). Default 4. */
  cols?: 2 | 3 | 4;
  className?: string;
};

const COL_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

export function StatCardGrid({ children, cols = 4, className }: GridProps) {
  return (
    <div className={cn("grid gap-3", COL_CLASS[cols], className)}>{children}</div>
  );
}
