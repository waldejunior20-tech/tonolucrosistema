import React from "react";
import { Money } from "./Money";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number;
  unit?: "BRL" | "PERCENT";
  signColor?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * KPI card limpo com hierarquia visual:
 * - Label pequena uppercase em Golos Text
 * - Valor grande em Plus Jakarta Sans com símbolo (R$ / %) reduzido
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit = "BRL",
  signColor = false,
  icon,
  className,
}) => {
  return (
    <div className={cn("card-premium", className)}>
      <div className="flex items-center justify-between">
        <span className="label-upper">{title}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-4">
        <Money
          value={value}
          unit={unit}
          signColor={signColor}
          symbolScale={0.55}
          className="kpi-number"
        />
      </div>
    </div>
  );
};
