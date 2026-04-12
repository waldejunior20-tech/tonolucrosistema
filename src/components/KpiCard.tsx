import { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number;
  formatter?: (v: number) => string;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  subtitle?: string;
  className?: string;
}

export function KpiCard({
  label, value, formatter, icon: Icon, trend, trendPositive = true, subtitle, className,
}: KpiCardProps) {
  return (
    <div className={cn("card-interactive group cursor-default", className)}>
      {/* Icon badge */}
      <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
        <Icon size={20} className="text-primary" />
      </div>

      {/* Label */}
      <p className="label-upper mb-1.5">{label}</p>

      {/* Big number */}
      <AnimatedNumber
        value={value}
        formatter={formatter}
        className="kpi-number text-foreground"
      />

      {/* Subtitle + trend inline */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        {trend && (
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-sm inline-flex items-center gap-1",
            trendPositive ? "trend-positive" : "trend-negative"
          )}>
            <span className="text-[10px]">{trendPositive ? "↑" : "↓"}</span>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
