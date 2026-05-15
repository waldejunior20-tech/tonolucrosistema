import { formatMoney } from "@/components/MoneyInput";
import { TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  totalGanho: number;
  totalGasto: number;
  totalTaxas: number;
  totalLiquido: number;
  qtdVendas: number;
  periodoLabel: string;
};

export function SaldoHero({ totalGanho, totalGasto, totalTaxas, totalLiquido, qtdVendas, periodoLabel }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl"
         style={{
           background:
             "linear-gradient(135deg, hsl(221 83% 18%) 0%, hsl(221 83% 32%) 45%, hsl(217 91% 50%) 100%)",
         }}>
      {/* Glow orbs */}
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] font-semibold text-white/70">
          <span>Saldo do período</span>
          <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 normal-case tracking-normal">
            {periodoLabel}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-[42px] sm:text-[56px] font-extrabold tabular-nums leading-none tracking-tight">
            {formatMoney(totalLiquido)}
          </p>
          <p className="mt-2 text-xs text-white/70">
            {qtdVendas} venda{qtdVendas !== 1 ? "s" : ""} · líquido após taxas
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat icon={TrendingUp} label="Entrou" value={totalGanho} tone="up" />
          <Stat icon={Receipt} label="Taxas" value={totalTaxas} tone="warn" />
          <Stat icon={TrendingDown} label="Saiu" value={totalGasto} tone="down" />
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "up" | "down" | "warn";
}) {
  const ring = tone === "up" ? "text-emerald-300" : tone === "down" ? "text-rose-300" : "text-amber-300";
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3">
      <div className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold", ring)}>
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-1 text-sm sm:text-base font-bold tabular-nums">{formatMoney(value)}</p>
    </div>
  );
}
