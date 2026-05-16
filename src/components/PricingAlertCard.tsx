import React from "react";
import { Money } from "./Money";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingAlertCardProps {
  titulo: string;
  /** Custo em % do preço (ex: 638.2). >100 = preço muito baixo. */
  custoPercentual: number;
  className?: string;
}

/**
 * Card de alerta de precificação.
 * Mostra o CMV (custo %) em destaque com cor automática.
 * - >100%: vermelho, "rever urgente"
 * - 40-100%: amarelo, "rever margem"
 * - <40%: verde, "margem saudável"
 */
export const PricingAlertCard: React.FC<PricingAlertCardProps> = ({
  titulo,
  custoPercentual,
  className,
}) => {
  const isCustoAlto = custoPercentual > 100;
  const isCustoMedio = custoPercentual > 40 && custoPercentual <= 100;

  const numberColor = isCustoAlto
    ? "text-destructive"
    : isCustoMedio
      ? "text-warning"
      : "text-success";

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <span className="label-upper">{titulo}</span>

      <div className="mt-3">
        <Money
          value={custoPercentual}
          unit="PERCENT"
          symbolScale={0.4}
          className={cn(
            "text-5xl font-extrabold tracking-tight leading-none",
            numberColor,
          )}
        />
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-sm font-medium">
        {isCustoAlto ? (
          <>
            <AlertTriangle size={14} className="text-destructive" />
            <span className="text-destructive">Preço muito baixo — rever urgente</span>
          </>
        ) : isCustoMedio ? (
          <>
            <AlertTriangle size={14} className="text-warning" />
            <span className="text-warning">Margem apertada — revisar</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-success">Margem saudável</span>
          </>
        )}
      </div>
    </div>
  );
};
