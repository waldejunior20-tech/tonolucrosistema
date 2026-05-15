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
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
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
    <div className="space-y-2">
      {movimentos.map((d) => (
        <div
          key={d.data}
          className="rounded-xl border border-border/50 bg-card p-3.5 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-foreground capitalize">{dateLabel(d.data)}</p>
            <p className="text-[10px] text-muted-foreground tabular-nums">{format(parseISO(d.data), "dd/MM/yyyy")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Cell icon={ArrowUpRight} label="Entrou" value={d.entrada} tone="success" />
            <Cell icon={Receipt} label="Taxa" value={d.taxas} tone="warning" prefix="-" />
            <Cell icon={ArrowDownRight} label="Saiu" value={d.saida} tone="destructive" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Cell({
  icon: Icon, label, value, tone, prefix = "",
}: { icon: any; label: string; value: number; tone: "success" | "warning" | "destructive"; prefix?: string }) {
  const colorMap = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  } as const;
  const bgMap = {
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10",
  } as const;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bgMap[tone]} ${colorMap[tone]}`}>
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className={`text-xs sm:text-sm font-bold tabular-nums ${value > 0 ? colorMap[tone] : "text-muted-foreground/60"}`}>
          {value > 0 ? `${prefix}${formatMoney(value)}` : "—"}
        </p>
      </div>
    </div>
  );
}
