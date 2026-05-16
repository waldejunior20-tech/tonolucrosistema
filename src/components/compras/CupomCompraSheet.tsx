import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMoney, formatQuantidade } from "@/components/MoneyInput";
import { TrendingUp, TrendingDown, Minus, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Money } from "@/components/Money";

export interface CupomItem {
  id: string;
  nome: string;
  nome_original: string;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  preco_total: number;
  variacao_pct: number | null; // null = sem histórico
  insumo_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fornecedor: string;
  data_compra: string;
  itens: CupomItem[];
}

export function CupomCompraSheet({ open, onOpenChange, fornecedor, data_compra, itens }: Props) {
  const navigate = useNavigate();
  const total = itens.reduce((acc, it) => acc + it.preco_total, 0);
  const dataLabel = data_compra
    ? format(new Date(data_compra + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border/60 p-0 max-h-[85vh] flex flex-col"
      >
        {/* Cupom header */}
        <SheetHeader className="px-5 pt-5 pb-4 text-center bg-gradient-to-b from-muted/40 to-transparent rounded-t-3xl">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-card border border-border/60 flex items-center justify-center mb-2">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <SheetTitle className="text-lg font-bold leading-tight">{fornecedor}</SheetTitle>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            {dataLabel}
          </p>
        </SheetHeader>

        {/* Itens (scroll) */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="border-y border-dashed border-border/60 py-1">
            {itens.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  if (!it.insumo_id) return;
                  onOpenChange(false);
                  navigate(`/insumos/historico-compras?insumo=${encodeURIComponent(it.nome)}`);
                }}
                className="w-full text-left py-3 border-b border-dashed border-border/40 last:border-b-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-[13px] font-bold text-foreground leading-tight">
                    {it.nome}
                  </div>
                  <div className="text-[13px] tabular-nums font-bold text-foreground shrink-0">
                    {<Money value={it.preco_total} />}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {formatQuantidade(it.quantidade, it.unidade_medida)} ×{" "}
                    {<Money value={it.preco_unitario} />}
                  </div>
                  <VariacaoBadge pct={it.variacao_pct} />
                </div>
              </button>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Total
            </div>
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {<Money value={total} />}
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 pt-2">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="h-1 w-1 rounded-full bg-border/60" />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VariacaoBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
        <Minus className="h-2.5 w-2.5" /> 1ª compra
      </span>
    );
  }
  const isUp = pct > 0.5;
  const isDown = pct < -0.5;
  const isFlat = !isUp && !isDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums",
        isUp && "text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/40",
        isDown && "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40",
        isFlat && "text-muted-foreground bg-muted/50"
      )}
    >
      {isUp && <TrendingUp className="h-2.5 w-2.5" />}
      {isDown && <TrendingDown className="h-2.5 w-2.5" />}
      {isFlat && <Minus className="h-2.5 w-2.5" />}
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}
