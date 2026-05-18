import { useState } from "react";
import { Plus, Minus, TrendingUp, TrendingDown, Receipt, AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageHero } from "@/components/layout/PageHero";
// StatCard removido — usamos GlassStat inline para o efeito de vidro premium
import { FinanceiroCategoryTabs } from "@/components/financeiro/FinanceiroCategoryTabs";
import { LancarReceitaDialog } from "@/components/caixa/LancarReceitaDialog";
import { LancarDespesaDialog } from "@/components/caixa/LancarDespesaDialog";
import { MovimentosTimeline } from "@/components/caixa/MovimentosTimeline";
import { useCaixaDiario } from "@/hooks/useCaixaDiario";
import { useCaixaPeriodo } from "@/hooks/useCaixaPeriodo";
import { useMovimentosCaixa } from "@/hooks/useMovimentosCaixa";

const PERIODOS = [7, 15, 30, 90] as const;
type Periodo = typeof PERIODOS[number];

export default function CaixaDiario() {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaOpen, setDespesaOpen] = useState(false);

  const { taxas } = useCaixaDiario(new Date());
  const periodoData = useCaixaPeriodo(periodo);
  const { movimentos, isLoading } = useMovimentosCaixa(periodo, taxas);

  const saldo = periodoData.totalLiquido - periodoData.totalGasto;
  const devedor = saldo < 0;

  const periodSelector = (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/15 border border-white/20 backdrop-blur-sm">
      {PERIODOS.map((p) => (
        <button
          key={p}
          onClick={() => setPeriodo(p)}
          className={cn(
            "px-3 py-1 rounded-md text-[12px] font-semibold transition-all",
            periodo === p ? "bg-white text-blue-700 shadow-sm" : "text-white/85 hover:text-white",
          )}
        >
          {p}d
        </button>
      ))}
    </div>
  );

  // Glass red hero (apenas quando devedor) — alto contraste, vidro translúcido
  const GlassRedHero = () => (
    <div
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6 fade-up shadow-lg text-white"
      style={{
        background: "linear-gradient(135deg, rgba(220, 38, 38, 0.4) 0%, rgba(220, 38, 38, 0.15) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(220, 38, 38, 0.2)",
        borderLeft: "4px solid #dc2626",
      }}
    >
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-red-500/15 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-red-950/70">
            Saldo dos últimos {periodo} dias
          </span>
          <div className="mt-0.5">
            <Money
              value={saldo}
              className="text-[32px] sm:text-[44px] leading-none font-bold text-red-950 [&_*]:text-red-950"
              symbolScale={0.5}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-red-950/85 mt-1.5 font-medium">
            <AlertTriangle size={14} strokeWidth={2.5} />
            Caixa devedor — necessita aportes · {periodoData.qtdVendas} venda{periodoData.qtdVendas !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">{periodSelector}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 page-enter">
      <FinanceiroCategoryTabs />

      <PageHeader title="Caixa Diário">
        <button
          onClick={() => setReceitaOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13.5px] font-bold hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm transition-all"
        >
          <Plus size={15} strokeWidth={2.75} />
          Lançar receita
        </button>
        <button
          onClick={() => setDespesaOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[13.5px] font-bold hover:bg-rose-100 hover:border-rose-300 hover:shadow-sm transition-all"
        >
          <Minus size={15} strokeWidth={2.75} />
          Lançar despesa
        </button>
      </PageHeader>

      {devedor ? (
        <GlassRedHero />
      ) : (
        <PageHero
          label={`Saldo dos últimos ${periodo} dias`}
          value={saldo}
          status="neutral"
          context={
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} strokeWidth={2.5} />
              Saldo positivo · {periodoData.qtdVendas} venda{periodoData.qtdVendas !== 1 ? "s" : ""}
            </span>
          }
          rightSlot={periodSelector}
        />
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ gap: "20px", marginTop: "24px" }}
      >
        <GlassStat label="Entrou" value={periodoData.totalGanho} icon={TrendingUp} variant="positive" />
        <GlassStat label="Taxas" value={periodoData.totalTaxas} icon={Receipt} variant="neutral" />
        <GlassStat label="Saiu" value={periodoData.totalGasto} icon={TrendingDown} variant="negative" />
      </div>

      {/* Movimentos timeline — linhas compactas */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Movimentos por dia</h3>
        <MovimentosTimeline movimentos={movimentos} isLoading={isLoading} />
      </div>

      <LancarReceitaDialog open={receitaOpen} onOpenChange={setReceitaOpen} taxas={taxas} />
      <LancarDespesaDialog open={despesaOpen} onOpenChange={setDespesaOpen} />
    </div>
  );
}

/** Card glass premium para os 3 resumos métricos do Caixa */
function GlassStat({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  variant: "positive" | "negative" | "neutral";
}) {
  const cfg = {
    positive: {
      borderLeft: "#2563eb",
      icon: "#2563eb",
      text: "#1e3a8a",
      boxShadow:
        "0 8px 32px 0 rgba(37, 99, 235, 0.08), inset 0 0 12px rgba(37, 99, 235, 0.05)",
    },
    negative: {
      borderLeft: "#dc2626",
      icon: "#dc2626",
      text: "#7f1d1d",
      boxShadow:
        "0 8px 32px 0 rgba(220, 38, 38, 0.08), inset 0 0 12px rgba(220, 38, 38, 0.05)",
    },
    neutral: {
      borderLeft: "#94a3b8",
      icon: "#64748b",
      text: "#1e293b",
      boxShadow:
        "0 8px 32px 0 rgba(100, 116, 139, 0.08), inset 0 0 12px rgba(100, 116, 139, 0.04)",
    },
  }[variant];

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.4)",
        borderLeft: `4px solid ${cfg.borderLeft}`,
        boxShadow: cfg.boxShadow,
        padding: "18px 20px",
      }}
      className="flex flex-col gap-2 transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-1.5">
        <Icon size={14} strokeWidth={2.5} style={{ color: cfg.icon }} />
        <span
          className="text-[11px] uppercase tracking-[0.08em]"
          style={{ color: cfg.icon, fontWeight: 700 }}
        >
          {label}
        </span>
      </div>
      <div style={{ color: cfg.text, fontWeight: 700 }} className="text-[22px] leading-tight text-finance-mono">
        <Money value={value} symbolScale={0.55} className="text-[22px] leading-tight" />
      </div>
    </div>
  );
}

