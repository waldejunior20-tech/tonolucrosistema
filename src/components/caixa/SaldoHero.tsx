import { formatMoney } from "@/components/MoneyInput";
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

export function SaldoHero({ totalGanho, totalGasto, totalTaxas, totalLiquido, qtdVendas, periodoLabel }: Props) {
  const isNegative = totalLiquido < 0;
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 sm:p-7 text-white shadow-xl"
      style={{
        background: isNegative
          ? "radial-gradient(120% 80% at 100% 0%, #F87171 0%, transparent 55%)," +
            "radial-gradient(100% 90% at 0% 100%, #7F1D1D 0%, transparent 60%)," +
            "linear-gradient(135deg, #DC2626 0%, #B91C1C 55%, #991B1B 100%)"
          : "radial-gradient(120% 80% at 100% 0%, #60A5FA 0%, transparent 55%)," +
            "radial-gradient(100% 90% at 0% 100%, #1E3A8A 0%, transparent 60%)," +
            "linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #1E40AF 100%)",
      }}
    >
      {/* Glow orbs */}
      <div
        className="absolute -top-16 -right-12 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #93C5FD 0%, transparent 70%)", opacity: 0.45 }}
      />
      <div
        className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)", opacity: 0.3 }}
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/75">
            Saldo do período
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[11px] font-medium text-white/95 whitespace-nowrap">
            {periodoLabel}
          </span>
        </div>

        {/* Balance */}
        <div className="mt-4 text-center">
          <Money
            value={totalLiquido}
            symbolScale={0.42}
            className="font-extrabold leading-none tracking-tight text-[clamp(28px,9vw,52px)]"
          />
        </div>
          <p className="mt-2 text-[11px] text-white/70">
            {qtdVendas} venda{qtdVendas !== 1 ? "s" : ""} · líquido após taxas
          </p>
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-3 gap-2">
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
  const labelColor =
    tone === "up" ? "text-emerald-200" : tone === "down" ? "text-rose-200" : "text-amber-200";
  return (
    <div
      className="rounded-xl border border-white/15 px-2 py-2.5 flex flex-col items-center text-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
      }}
    >
      <div className={cn("flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold", labelColor)}>
        <Icon size={11} />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 w-full font-bold tabular-nums leading-none text-center text-[clamp(10px,2.4vw,13px)] truncate">
        {formatMoney(value)}
      </p>
    </div>
  );
}
