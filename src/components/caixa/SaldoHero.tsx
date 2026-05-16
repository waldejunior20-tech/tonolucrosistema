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

const brl = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SaldoHero({
  totalGanho,
  totalGasto,
  totalTaxas,
  totalLiquido,
  qtdVendas,
  periodoLabel,
}: Props) {
  const saldoNegativo = totalLiquido < 0;
  const corSaldoClass = saldoNegativo
    ? "bg-red-50/20 border-red-100"
    : "bg-blue-50/20 border-blue-100";

  return (
    <div
      className={cn(
        "p-6 rounded-xl border shadow-sm transition-all duration-300",
        corSaldoClass,
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* BLOCO DO SALDO PRINCIPAL */}
        <div className="flex flex-col gap-1">
          <span className="text-mini-label">Saldo do Período</span>
          <div className="flex items-baseline mt-1">
            <span
              className={cn(
                "text-lg font-normal mr-1",
                saldoNegativo ? "text-red-400" : "text-blue-400",
              )}
            >
              R$ {saldoNegativo && "-"}
            </span>
            <span
              className={cn(
                "text-kpi-giant text-3xl tracking-tight",
                saldoNegativo ? "text-red-600" : "text-blue-600",
              )}
            >
              {brl.format(Math.abs(totalLiquido))}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5">
            {saldoNegativo
              ? "⚠️ Caixa devedor — necessita aportes"
              : "✅ Contas pagas — saldo positivo"}
            {" · "}
            {periodoLabel} · {qtdVendas} venda{qtdVendas !== 1 ? "s" : ""}
          </span>
        </div>

        {/* MINI-STATS */}
        <div className="flex items-center gap-5">
          <Stat icon={TrendingUp} label="Entrou" value={totalGanho} tone="up" />
          <div className="h-8 w-px bg-slate-200" />
          <Stat icon={Receipt} label="Taxas" value={totalTaxas} tone="warn" />
          <div className="h-8 w-px bg-slate-200" />
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
    tone === "up"
      ? "text-emerald-600"
      : tone === "down"
        ? "text-rose-600"
        : "text-amber-600";
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} strokeWidth={2.25} />
      <div className="flex flex-col leading-tight">
        <span className="text-mini-label">{label}</span>
        <Money
          value={value}
          symbolScale={0.55}
          className="text-[14px] text-slate-900 leading-none mt-0.5"
        />
      </div>
    </div>
  );
}
