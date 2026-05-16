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

