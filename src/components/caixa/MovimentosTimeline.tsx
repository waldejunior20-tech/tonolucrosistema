import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";
import type { DiaMovimento } from "@/hooks/useMovimentosCaixa";

function dateLabel(s: string) {
  const d = parseISO(s);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "EEE, dd 'de' MMM", { locale: ptBR });
}

export function MovimentosTimeline({ movimentos, isLoading }: { movimentos: DiaMovimento[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (movimentos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">Nenhum movimento no período.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden divide-y divide-border/40">
      {movimentos.map((d) => (
        <div
          key={d.data}
          className="grid grid-cols-[minmax(180px,1.2fr)_1fr_1fr_1fr] items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
        >
          {/* Data */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground capitalize leading-tight">{dateLabel(d.data)}</p>
            <p className="text-[10.5px] text-muted-foreground tabular-nums">{format(parseISO(d.data), "dd/MM/yyyy")}</p>
          </div>

          <Cell icon={ArrowUpRight} label="Entrou" value={d.entrada} tone="success" />
          <Cell icon={Receipt} label="Taxa" value={d.taxas} tone="warning" prefix="-" />
          <Cell icon={ArrowDownRight} label="Saiu" value={d.saida} tone="destructive" />
        </div>
      ))}
    </div>
  );
}

function Cell({
  icon: Icon, label, value, tone, prefix = "",
}: { icon: any; label: string; value: number; tone: "success" | "warning" | "destructive"; prefix?: string }) {
  // Ocultação de zeros: cell vazio limpo (sem traço cinza)
  if (value <= 0) {
    return <div aria-hidden />;
  }

  // Paleta premium de alta legibilidade
  const palette = {
    success:     { color: "#16a34a", bg: "bg-emerald-50",  ring: "text-emerald-600" },
    warning:     { color: "#854d0e", bg: "bg-amber-50",    ring: "text-amber-700" },
    destructive: { color: "#991b1b", bg: "bg-rose-50",     ring: "text-rose-700" },
  } as const;
  const p = palette[tone];

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${p.bg} ${p.ring}`}>
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight">{label}</p>
        <p
          className="text-[13px] sm:text-[14px] tabular-nums leading-tight text-finance-mono"
          style={{ color: p.color, fontWeight: 700 }}
        >
          {prefix}{formatMoney(value)}
        </p>
      </div>
    </div>
  );
}
