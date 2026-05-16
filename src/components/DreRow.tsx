import React from "react";
import { Money } from "./Money";
import { cn } from "@/lib/utils";

interface DreRowProps {
  label: string;
  value: number;
  /** Linha de subtotal/total — destaque + fundo sutil. */
  isTotal?: boolean;
  /** Aplica verde/vermelho conforme sinal. */
  signColor?: boolean;
}

/**
 * Linha do DRE com hierarquia visual.
 * O R$ vem pequeno, número grande, total em destaque.
 */
export const DreRow: React.FC<DreRowProps> = ({
  label,
  value,
  isTotal = false,
  signColor = false,
}) => (
  <div
    className={cn(
      "flex justify-between items-center py-3 border-b border-border/40",
      isTotal && "bg-muted/40 px-3 rounded-lg border-transparent",
    )}
  >
    <span
      className={cn(
        "text-sm",
        isTotal ? "text-foreground font-bold" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
    <Money
      value={value}
      unit="BRL"
      signColor={signColor}
      symbolScale={0.65}
      className={
        isTotal
          ? "text-base font-bold text-foreground"
          : "text-sm font-semibold text-foreground"
      }
    />
  </div>
);
