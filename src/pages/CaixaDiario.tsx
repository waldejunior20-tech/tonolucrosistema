import { useState } from "react";
import { Plus, Minus, TrendingUp, TrendingDown, Receipt, ShoppingBag } from "lucide-react";
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

  return (
    <div className="space-y-5 page-enter">
      <FinanceiroCategoryTabs />
      <PageHeader title="Caixa Diário" />

      <PageHero
        label={`Saldo dos últimos ${periodo} dias`}
        value={saldo}
        status={devedor ? "danger" : "neutral"}
        context={
          devedor
            ? `⚠️ Caixa devedor — necessita aportes · ${periodoData.qtdVendas} venda${periodoData.qtdVendas !== 1 ? "s" : ""}`
            : `✅ Saldo positivo · ${periodoData.qtdVendas} venda${periodoData.qtdVendas !== 1 ? "s" : ""}`
        }
        rightSlot={periodSelector}
      />

      <StatCardGrid cols={3}>
        <StatCard icon={TrendingUp} tone="up" label="Entrou" value={periodoData.totalGanho} />
        <StatCard icon={Receipt} tone="warn" label="Taxas" value={periodoData.totalTaxas} />
        <StatCard icon={TrendingDown} tone="down" label="Saiu" value={periodoData.totalGasto} />
      </StatCardGrid>

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

