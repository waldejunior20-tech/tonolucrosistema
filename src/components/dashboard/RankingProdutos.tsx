import { useRankingProdutos } from "@/hooks/useRankingProdutos";
import { Trophy, Pizza, Package, Coffee, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RankingProdutos() {
  const { top5, totalReceita, isLoading } = useRankingProdutos();

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-7 transition-all duration-300 hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[16px] font-bold text-foreground flex items-center gap-2">
            <Trophy size={16} className="text-warning" />
            Top 5 produtos do mês
          </h3>
          <p className="text-[12px] text-muted-foreground/60 mt-0.5">Por quantidade vendida — com lucro real</p>
        </div>
        {totalReceita > 0 && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-success/10 text-success">
            Receita {formatBRL(totalReceita)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : top5.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
            <TrendingUp size={20} className="text-muted-foreground/40" />
          </div>
          <p className="text-[12px] text-muted-foreground max-w-[260px]">
            Nenhuma venda registrada este mês. Use "Nova venda (com produtos)" no Caixa Diário para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {top5.map((item, idx) => {
            const Icon = item.tipo === "pizza" ? Pizza : item.tipo === "bebida" ? Coffee : Package;
            const iconBg =
              item.tipo === "pizza" ? "bg-orange/10 text-orange" :
              item.tipo === "bebida" ? "bg-info/10 text-info" :
              "bg-primary/10 text-primary";
            const margemColor =
              item.margemPct >= 50 ? "text-success bg-success/10" :
              item.margemPct >= 25 ? "text-warning bg-warning/10" :
              "text-destructive bg-destructive/10";

            return (
              <div
                key={item.key}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[12px] font-extrabold text-muted-foreground tabular-nums shrink-0">
                  {idx + 1}
                </div>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">
                    {item.nome}{item.tamanho && <span className="text-muted-foreground"> ({item.tamanho})</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {item.quantidade}x · {formatBRL(item.receita)} · lucro {formatBRL(item.lucro)}
                  </p>
                </div>
                <span className={cn("text-[11px] font-bold px-2 py-1 rounded-md tabular-nums shrink-0", margemColor)}>
                  {item.margemPct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
