import { formatMoney } from "@/components/MoneyInput";
import { ChevronRight, Receipt } from "lucide-react";
import { Money } from "@/components/Money";

export interface CompraGrupo {
  key: string;
  fornecedor: string;
  data_compra: string;
  total: number;
  itensCount: number;
}

interface Props {
  compra: CompraGrupo;
  onClick: () => void;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function CompraCard({ compra, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-border hover:shadow-sm active:scale-[0.99] transition-all text-left"
    >
      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
        {compra.fornecedor === "Sem fornecedor" ? (
          <Receipt className="h-5 w-5 text-primary" />
        ) : (
          <span className="text-[13px] font-bold text-primary">
            {getInitials(compra.fornecedor)}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-foreground truncate leading-tight">
          {compra.fornecedor}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {compra.itensCount} {compra.itensCount === 1 ? "item" : "itens"}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="text-[14px] tabular-nums font-bold text-foreground">
          {<Money value={compra.total} />}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
