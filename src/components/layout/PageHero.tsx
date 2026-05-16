import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";
import type { ReactNode } from "react";

export type HeroStatus = "neutral" | "danger" | "success" | "warning";

type Props = {
  /** Mini label uppercase no topo (ex: "SALDO DO PERÍODO", "ÚLTIMOS 30 DIAS"). */
  label: string;
  /** Valor herói principal. Se number, renderiza com <Money/>. Se ReactNode, renderiza direto. */
  value: number | ReactNode;
  /** Unidade do valor quando number. */
  unit?: "BRL" | "PERCENT" | "COUNT";
  /** Linha de contexto abaixo do valor (ex: "22 compras · 82 itens", "⚠️ Caixa devedor"). */
  context?: ReactNode;
  /** Define a cor do degradê. Default: neutral (azul). */
  status?: HeroStatus;
  /** Slot opcional à direita (filtros, CTA, sparkline). */
  rightSlot?: ReactNode;
  className?: string;
};

const GRADIENTS: Record<HeroStatus, string> = {
  neutral: "from-blue-600 to-blue-700",
  danger: "from-red-600 to-red-700",
  success: "from-emerald-600 to-emerald-700",
  warning: "from-amber-600 to-amber-700",
};

/**
 * Card herói padrão do topo de toda página.
 * Azul degradê por default; muda para vermelho/verde/amarelo via prop `status`.
 * Altura compacta, tipografia travada (44px desktop / 32px mobile), legível para idoso.
 */
export function PageHero({
  label,
  value,
  unit = "BRL",
  context,
  status = "neutral",
  rightSlot,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 sm:p-6 fade-up shadow-lg text-white",
        "bg-gradient-to-br",
        GRADIENTS[status],
        className,
      )}
    >
      {/* Soft glow decorativo */}
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* ESQUERDA: label + valor + contexto */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/75">
            {label}
          </span>

          <div className="mt-0.5">
            {typeof value === "number" ? (
              <Money
                value={value}
                unit={unit === "COUNT" ? undefined as any : unit}
                onDark
                className="text-[32px] sm:text-[44px] leading-none font-semibold"
                symbolScale={0.5}
              />
            ) : (
              <div className="text-[32px] sm:text-[44px] leading-none font-semibold text-finance-mono">
                {value}
              </div>
            )}
          </div>

          {context && (
            <div className="text-[13px] text-white/85 mt-1.5">{context}</div>
          )}
        </div>

        {/* DIREITA: slot livre */}
        {rightSlot && (
          <div className="flex-shrink-0 flex items-center gap-2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}
