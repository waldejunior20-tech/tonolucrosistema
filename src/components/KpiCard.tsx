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
    <div className={cn("card-premium group cursor-default", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
          <Icon size={20} className="text-primary" />
        </div>
        {trend && (
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-sm",
            trendPositive ? "trend-positive" : "trend-negative"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="label-upper mb-2">{label}</p>
      <AnimatedNumber
        value={value}
        formatter={formatter}
        className="kpi-number text-foreground"
      />
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
