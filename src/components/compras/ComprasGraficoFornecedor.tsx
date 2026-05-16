import { useMemo, useState } from "react";
import { formatMoney } from "@/components/MoneyInput";
import { Store, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";

interface Row {
  fornecedor: string | null;
  insumo_categoria: string | null;
  preco_total: number | null;
  preco_unitario: number;
  quantidade: number;
}

interface Props {
  rows: Row[];
  selectedFornecedor: string | null;
  onSelectFornecedor: (f: string | null) => void;
}

type Modo = "fornecedor" | "categoria";

export function ComprasGraficoFornecedor({ rows, selectedFornecedor, onSelectFornecedor }: Props) {
  const [modo, setModo] = useState<Modo>("fornecedor");

  const data = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key =
        modo === "fornecedor"
          ? r.fornecedor ?? "Sem fornecedor"
          : r.insumo_categoria ?? "Sem categoria";
      const v = Number(r.preco_total ?? r.preco_unitario * r.quantidade);
      map.set(key, (map.get(key) ?? 0) + v);
    });
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    const arr = Array.from(map.entries())
      .map(([nome, valor]) => ({ nome, valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
    return { items: arr, total };
  }, [rows, modo]);

  if (data.items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 fade-up text-slate-400">
      {/* Toggle modo */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          Top {data.items.length} {modo === "fornecedor" ? "fornecedores" : "categorias"}
        </div>
        <div className="inline-flex items-center bg-muted/40 rounded-full p-0.5 text-[11px] font-semibold">
          <button
            onClick={() => setModo("fornecedor")}
            className={cn(
              "h-6 px-2.5 rounded-full inline-flex items-center gap-1 transition-all",
              modo === "fornecedor"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <Store className="h-3 w-3" /> Fornecedor
          </button>
          <button
            onClick={() => setModo("categoria")}
            className={cn(
              "h-6 px-2.5 rounded-full inline-flex items-center gap-1 transition-all",
              modo === "categoria"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            <Tag className="h-3 w-3" /> Categoria
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.items.map((it) => {
          const isSelected =
            modo === "fornecedor" && selectedFornecedor === it.nome;
          const dimmed =
            modo === "fornecedor" &&
            selectedFornecedor !== null &&
            selectedFornecedor !== it.nome;

          return (
            <button
              key={it.nome}
              onClick={() => {
                if (modo !== "fornecedor") return;
                onSelectFornecedor(isSelected ? null : it.nome);
              }}
              className={cn(
                "w-full text-left group transition-opacity",
                dimmed && "opacity-40",
                modo !== "fornecedor" && "cursor-default"
              )}
            >
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  {it.nome}
                </span>
                <span className="text-[12px] tabular-nums font-bold text-foreground shrink-0">
                  {<Money value={it.valor} />}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all",
                    isSelected
                      ? "bg-gradient-to-r from-primary to-primary/70"
                      : "bg-gradient-to-r from-foreground/80 to-foreground/50"
                  )}
                  style={{ width: `${Math.max(it.pct, 2)}%` }}
                />
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground mt-0.5">
                {it.pct.toFixed(1)}% do total
              </div>
            </button>
          );
        })}
      </div>

      {selectedFornecedor && (
        <button
          onClick={() => onSelectFornecedor(null)}
          className="mt-3 text-[11px] text-primary font-semibold hover:underline"
        >
          ← Ver todos os fornecedores
        </button>
      )}
    </div>
  );
}
