import { useState } from "react";
import { Plus, Minus, TrendingUp, TrendingDown, Receipt, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageHero } from "@/components/layout/PageHero";
import { StatCard, StatCardGrid } from "@/components/layout/StatCardGrid";
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

  const saldo = periodoData.totalGanho - periodoData.totalGasto - periodoData.totalTaxas;
  const negativo = saldo < 0;

  const periodSelector = (
    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white/15 border border-white/25 backdrop-blur-sm">
      {PERIODOS.map((p) => (
        <button
          key={p}
          onClick={() => setPeriodo(p)}
          className={cn(
            "px-3 py-1 rounded-md text-[12px] font-semibold transition-all",
            periodo === p
              ? "bg-white text-blue-700 shadow-sm"
              : "text-white/80 hover:text-white",
          )}
        >
          {p}d
        </button>
      ))}
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

      <PageHero
        label={`SALDO DOS ÚLTIMOS ${periodo} DIAS`}
        value={saldo}
        status={negativo ? "danger" : "neutral"}
        context={
          negativo ? (
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle size={14} /> Caixa devedor no período
            </span>
          ) : (
            `${movimentos.length} ${movimentos.length === 1 ? "dia" : "dias"} com movimento`
          )
        }
        rightSlot={periodSelector}
      />

      <StatCardGrid cols={3}>
        <StatCard label="Entrou" value={periodoData.totalGanho} icon={TrendingUp} tone="up" />
        <StatCard label="Taxas" value={periodoData.totalTaxas} icon={Receipt} tone="warn" />
        <StatCard label="Saiu" value={periodoData.totalGasto} icon={TrendingDown} tone="down" />
      </StatCardGrid>

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

