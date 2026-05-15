import { useState } from "react";
import { formatMoney } from "@/components/MoneyInput";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceiroCategoryTabs } from "@/components/financeiro/FinanceiroCategoryTabs";
import { FechamentoDiaForm } from "@/components/caixa/FechamentoDiaForm";
import { useCaixaDiario } from "@/hooks/useCaixaDiario";
import { useCaixaPeriodo } from "@/hooks/useCaixaPeriodo";

const PERIODOS = [7, 15, 30, 90] as const;
type Periodo = typeof PERIODOS[number];

export default function CaixaDiario() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [periodo, setPeriodo] = useState<Periodo>(30);

  const { taxas } = useCaixaDiario(selectedDate);
  const periodoData = useCaixaPeriodo(periodo);

  return (
    <div className="space-y-6 page-enter">
      <FinanceiroCategoryTabs />
      <PageHeader title="Caixa Diário" />

      {/* Formulário de fechamento */}
      <FechamentoDiaForm taxas={taxas} onSelectDate={setSelectedDate} />


      {/* Filtro por período */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Resumo por período</h3>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border/40">
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                  periodo === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-card border border-border/60 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Ganhou ({periodo}d)
            </p>
            <p className="num-depth-dark text-[24px] tabular-nums leading-none text-success">
              {formatMoney(periodoData.totalGanho)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {periodoData.qtdVendas} venda{periodoData.qtdVendas !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border/60 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Pagou em taxas
            </p>
            <p className="num-depth-dark text-[24px] tabular-nums leading-none text-warning">
              - {formatMoney(periodoData.totalTaxas)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              líq {formatMoney(periodoData.totalLiquido)}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border/60 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Gastou ({periodo}d)
            </p>
            <p className="num-depth-dark text-[24px] tabular-nums leading-none text-destructive">
              {formatMoney(periodoData.totalGasto)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">despesas pagas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
