import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMoney } from "@/components/MoneyInput";
import type { DiaMovimento } from "@/hooks/useMovimentosCaixa";

function dateLabel(s: string) {
  const d = parseISO(s);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEE, dd 'de' MMM", { locale: ptBR });
}

const COLS = "grid grid-cols-[180px_140px_120px_140px] gap-4";

export function MovimentosTimeline({ movimentos, isLoading }: { movimentos: DiaMovimento[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="max-w-[900px] space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (movimentos.length === 0) {
    return (
      <div className="max-w-[900px] rounded-xl border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhum movimento no período.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <div className={`${COLS} px-4 py-2.5 bg-slate-50/60 border-b border-slate-200/70`}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Data</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Entradas</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Taxas</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Saídas</span>
      </div>

      {/* Rows */}
      {movimentos.map((d, i) => (
        <div
          key={d.data}
          className={`${COLS} items-center px-4 py-2.5 hover:bg-slate-50/50 transition-colors`}
          style={i < movimentos.length - 1 ? { borderBottom: "1px solid #f1f5f9" } : undefined}
        >
          {/* Coluna 1 — Data/Dia */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground capitalize leading-tight">{dateLabel(d.data)}</p>
            <p className="text-[10.5px] text-muted-foreground tabular-nums leading-tight mt-0.5">
              {format(parseISO(d.data), "dd/MM/yyyy")}
            </p>
          </div>

          {/* Coluna 2 — Entradas */}
          <Value value={d.entrada} color="#16a34a" />

          {/* Coluna 3 — Taxas */}
          <Value value={d.taxas} color="#854d0e" prefix="-" />

          {/* Coluna 4 — Saídas */}
          <Value value={d.saida} color="#991b1b" />
        </div>
      ))}
    </div>
  );
}

function Value({ value, color, prefix = "" }: { value: number; color: string; prefix?: string }) {
  if (value <= 0) {
    return <span className="text-center text-slate-300 text-finance-mono text-[13px] select-none">—</span>;
  }
  return (
    <span
      className="text-right text-finance-mono text-[13.5px] tabular-nums leading-tight"
      style={{ color, fontWeight: 600 }}
    >
      {prefix}{formatMoney(value)}
    </span>
  );
}
