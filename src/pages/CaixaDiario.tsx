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

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setReceitaOpen(true)}
          className="group relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/5 to-success/10 p-4 text-left hover:border-success/60 hover:shadow-lg hover:shadow-success/10 transition-all active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-success text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <p className="mt-3 text-sm font-bold text-foreground">Lançar receita</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Vendas do dia</p>
        </button>

        <button
          onClick={() => setDespesaOpen(true)}
          className="group relative overflow-hidden rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-4 text-left hover:border-destructive/60 hover:shadow-lg hover:shadow-destructive/10 transition-all active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Minus size={18} strokeWidth={2.5} />
          </div>
          <p className="mt-3 text-sm font-bold text-foreground">Lançar despesa</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Gastos e contas</p>
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
