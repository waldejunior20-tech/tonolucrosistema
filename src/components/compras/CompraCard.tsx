import { ChevronRight, Receipt, ShoppingCart, Fuel, Mic, Beef, Croissant, Wine, Pill, Wrench, Store } from "lucide-react";
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

function toTitleCase(name: string): string {
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e", "para", "a", "o"]);
  const siglas = new Set(["LTDA", "ME", "EPP", "S/A", "SA", "EIRELI", "MEI"]);
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => {
      const upper = w.toUpperCase();
      if (siglas.has(upper)) return upper;
      if (i > 0 && minusculas.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function getIconForFornecedor(name: string) {
  const n = name.toLowerCase();
  if (/(super|mercado|atacad|hiper|verdur|sacol|hortifr|feira)/.test(n)) return ShoppingCart;
  if (/(posto|combust|gasolina|petrobr|ipiranga|shell|ale)/.test(n)) return Fuel;
  if (/(audio|áudio|whats|gravac|gravaç)/.test(n)) return Mic;
  if (/(acoug|açoug|frigor|carne|boi|aves|fran)/.test(n)) return Beef;
  if (/(padar|panif|confeit)/.test(n)) return Croissant;
  if (/(bebid|distribuid|adega|cerve)/.test(n)) return Wine;
  if (/(farmac|farmác|drogar)/.test(n)) return Pill;
  if (/(ferrag|materiais|construc|construç|manuten)/.test(n)) return Wrench;
  if (name === "Sem fornecedor") return Receipt;
  return Store;
}

export function CompraCard({ compra, onClick }: Props) {
  const Icon = getIconForFornecedor(compra.fornecedor);
  const nomeAmigavel = compra.fornecedor === "Sem fornecedor" ? compra.fornecedor : toTitleCase(compra.fornecedor);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 hover:border-border hover:shadow-sm active:scale-[0.99] transition-all text-left"
    >
      <div className="h-11 w-11 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
        <Icon className="h-[18px] w-[18px] text-[#2563EB]" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-foreground truncate leading-tight normal-case">
          {nomeAmigavel}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {compra.itensCount} {compra.itensCount === 1 ? "item" : "itens"}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="text-[16px] tabular-nums font-bold text-foreground text-finance-mono">
          <Money value={compra.total} />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}
