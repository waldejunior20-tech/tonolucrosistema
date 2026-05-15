import { useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  const { totalBruto, totalLiquido, totalTaxas, totalVendas, taxas } = useCaixaDiario(selectedDate);
  const periodoData = useCaixaPeriodo(periodo);

  const dateLabel = isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 page-enter">
      <FinanceiroCategoryTabs />
      <PageHeader title="Caixa Diário" />

      {/* Hero azul — totais do dia */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 shadow-lg">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold">
              {dateLabel}
            </p>
            <p className="text-sm text-primary-foreground/90 font-medium">
              {totalVendas} venda{totalVendas !== 1 ? "s" : ""} registrada{totalVendas !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Bruto</p>
            <p className="num-depth-light text-[22px] sm:text-[26px] tabular-nums leading-none">{formatMoney(totalBruto)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Taxas</p>
            <p className="num-depth-light text-[18px] sm:text-[22px] tabular-nums leading-none">- {formatMoney(totalTaxas)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-1">Líquido</p>
            <p className="num-depth-light text-[22px] sm:text-[26px] tabular-nums leading-none">{formatMoney(totalLiquido)}</p>
          </div>
        </div>
      </div>

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
