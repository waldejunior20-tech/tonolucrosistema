import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatQuantidade } from "@/components/MoneyInput";
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
  variacao_pct: number | null;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 text-center bg-gradient-to-b from-muted/40 to-transparent">
          <div className="mx-auto h-10 w-10 rounded-xl bg-card border border-border/60 flex items-center justify-center mb-2">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <DialogTitle className="text-sm font-bold leading-tight uppercase tracking-wide">
            {fornecedor}
          </DialogTitle>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {dataLabel}
          </p>
        </DialogHeader>

        {/* Itens */}
        <div className="max-h-[55vh] overflow-y-auto px-4 pb-2">
          <div className="border-y border-dashed border-border/60">
            {itens.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  if (!it.insumo_id) return;
                  onOpenChange(false);
                  navigate(`/insumos/historico-compras?insumo=${encodeURIComponent(it.nome)}`);
                }}
                className="w-full text-left py-2 border-b border-dashed border-border/40 last:border-b-0 hover:bg-muted/30 px-1 rounded transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold text-foreground leading-tight truncate">
                      {it.nome}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                      {formatQuantidade(it.quantidade, it.unidade_medida)} ×{" "}
                      <Money value={it.preco_unitario} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="text-[12px] tabular-nums font-bold text-foreground">
                      <Money value={it.preco_total} />
                    </div>
                    <VariacaoBadge pct={it.variacao_pct} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/20">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            Total
          </div>
          <div className="text-lg font-bold tabular-nums text-foreground">
            <Money value={total} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
