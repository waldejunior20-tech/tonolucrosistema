import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceiroCategoryTabs } from "@/components/financeiro/FinanceiroCategoryTabs";
import { SaldoHero } from "@/components/caixa/SaldoHero";
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

  return (
    <div className="space-y-5 page-enter">
      <FinanceiroCategoryTabs />
      <PageHeader title="Caixa Diário" />

      {/* Period selector */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Resumo</h3>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/40">
          {PERIODOS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                periodo === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Futuristic balance hero */}
      <SaldoHero
        totalGanho={periodoData.totalGanho}
        totalGasto={periodoData.totalGasto}
        totalTaxas={periodoData.totalTaxas}
        totalLiquido={periodoData.totalLiquido - periodoData.totalGasto}
        qtdVendas={periodoData.qtdVendas}
        periodoLabel={`Últimos ${periodo} dias`}
      />

      {/* Quick actions - compact */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setReceitaOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[13px] font-semibold hover:bg-emerald-100 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          Lançar receita
        </button>
        <button
          onClick={() => setDespesaOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[13px] font-semibold hover:bg-rose-100 transition-colors"
        >
          <Minus size={14} strokeWidth={2.5} />
          Lançar despesa
        </button>
      </div>

      {/* Movimentos timeline */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Movimentos por dia</h3>
        <MovimentosTimeline movimentos={movimentos} isLoading={isLoading} />
      </div>

      <LancarReceitaDialog open={receitaOpen} onOpenChange={setReceitaOpen} taxas={taxas} />
      <LancarDespesaDialog open={despesaOpen} onOpenChange={setDespesaOpen} />
    </div>
  );
}

function ActionCard({
  tone,
  icon,
  title,
  subtitle,
  onClick,
}: {
  tone: "success" | "destructive";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  const accent = tone === "success" ? "bg-success" : "bg-destructive";
  const ring = tone === "success" ? "border-success/25 hover:border-success/50" : "border-destructive/25 hover:border-destructive/50";
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all active:scale-[0.98] hover:shadow-lg",
        ring,
      )}
      style={{
        background:
          "linear-gradient(160deg, rgba(37,99,235,0.06) 0%, rgba(29,78,216,0.10) 100%)",
      }}
    >
      {/* subtle blue glow */}
      <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform", accent)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
