
import { cn } from "@/lib/utils";

interface HealthStatusProps {
  status: "healthy" | "warning" | "danger";
  label?: string;
}

export function HealthStatus({ status, label }: HealthStatusProps) {
  const statusConfig = {
    healthy: {
      color: "bg-success",
      glow: "shadow-[0_0_8px_hsl(var(--success))]",
      text: "Negócio Saudável",
      pulseClass: "health-pulse-green",
      barBg: "bg-success/10",
      border: "border-success/20"
    },
    warning: {
      color: "bg-warning",
      glow: "shadow-[0_0_8px_hsl(var(--warning))]",
      text: "Atenção Necessária",
      pulseClass: "health-pulse-amber",
      barBg: "bg-warning/10",
      border: "border-warning/20"
    },
    danger: {
      color: "bg-destructive",
      glow: "shadow-[0_0_8px_hsl(var(--destructive))]",
      text: "Situação de Prejuízo",
      pulseClass: "health-pulse",
      barBg: "bg-destructive/10",
      border: "border-destructive/20"
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn(
      "w-full h-10 px-4 rounded-lg flex items-center justify-center gap-3 border mb-6",
      config.barBg,
      config.border
    )}>
      <div className={cn("w-3 h-3 rounded-full", config.color, config.glow, config.pulseClass)} />
      <span className="text-sm font-bold tracking-tight uppercase font-heading">
        {label || config.text}
      </span>
    </div>
  );
}
