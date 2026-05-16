import { Money } from "@/components/Money";
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

export function SaldoHero({
  totalGanho,
  totalGasto,
  totalTaxas,
  totalLiquido,
  qtdVendas,
  periodoLabel,
}: Props) {
  const isNegative = totalLiquido < 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* Saldo principal */}
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-400">
            Saldo
          </span>
          <Money
            value={totalLiquido}
            symbolScale={0.5}
            className={cn(
              "font-semibold leading-none tracking-tight text-2xl",
              isNegative ? "text-destructive" : "text-slate-900",
            )}
          />
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            {periodoLabel} · {qtdVendas} venda{qtdVendas !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Stats inline */}
        <div className="flex items-center gap-5">
          <Stat icon={TrendingUp} label="Entrou" value={totalGanho} tone="up" />
          <div className="h-6 w-px bg-slate-200" />
          <Stat icon={Receipt} label="Taxas" value={totalTaxas} tone="warn" />
          <div className="h-6 w-px bg-slate-200" />
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
  const color =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-amber-600";
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className={color} strokeWidth={2.25} />
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
          {label}
        </span>
        <Money
          value={value}
          symbolScale={0.55}
          className="text-[13px] font-semibold text-slate-900 leading-none mt-0.5"
        />
      </div>
    </div>
  );
}
