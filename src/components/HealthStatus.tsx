
import { cn } from "@/lib/utils";

interface HealthStatusProps {
  status: "healthy" | "warning" | "danger";
  label?: string;
}

export function HealthStatus({ status, label }: HealthStatusProps) {
  const statusConfig = {
    healthy: {
      color: "bg-[#27AE60]",
      glow: "shadow-[0_0_8px_#27AE60]",
      text: "Negócio Saudável",
      pulseClass: "health-pulse-green",
      barBg: "bg-[#27AE60]/10",
      border: "border-[#27AE60]/20"
    },
    warning: {
      color: "bg-[#F39C12]",
      glow: "shadow-[0_0_8px_#F39C12]",
      text: "Atenção Necessária",
      pulseClass: "health-pulse-amber",
      barBg: "bg-[#F39C12]/10",
      border: "border-[#F39C12]/20"
    },
    danger: {
      color: "bg-[#C0392B]",
      glow: "shadow-[0_0_8px_#C0392B]",
      text: "Situação de Prejuízo",
      pulseClass: "health-pulse",
      barBg: "bg-[#C0392B]/10",
      border: "border-[#C0392B]/20"
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
      <span className="text-sm font-bold tracking-tight uppercase font-syne">
        {label || config.text}
      </span>
    </div>
  );
}
