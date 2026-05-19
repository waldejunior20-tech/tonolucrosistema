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
    <div
      className="relative rounded-2xl p-5 fade-up overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.9) inset, 0 12px 32px -16px rgba(15,23,42,0.12), 0 2px 6px -2px rgba(15,23,42,0.06)",
      }}
    >
      {/* Toggle modo */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500 font-bold">
            Top {data.items.length} {modo === "fornecedor" ? "fornecedores" : "categorias"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ordenado por gasto no período</div>
        </div>
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 text-[11.5px] font-semibold border border-slate-200/80">
          <button
            onClick={() => setModo("fornecedor")}
            className={cn(
              "h-7 px-3 rounded-md inline-flex items-center gap-1.5 transition-all",
              modo === "fornecedor"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Store className="h-3 w-3" /> Fornecedor
          </button>
          <button
            onClick={() => setModo("categoria")}
            className={cn(
              "h-7 px-3 rounded-md inline-flex items-center gap-1.5 transition-all",
              modo === "categoria"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Tag className="h-3 w-3" /> Categoria
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {data.items.map((it, idx) => {
          const isSelected =
            modo === "fornecedor" && selectedFornecedor === it.nome;
          const dimmed =
            modo === "fornecedor" &&
            selectedFornecedor !== null &&
            selectedFornecedor !== it.nome;
          const rank = idx + 1;
          const isLeader = rank === 1;

          const rankStyle =
            rank === 1
              ? "bg-amber-500 text-white shadow-sm"
              : rank === 2
              ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
              : rank === 3
              ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white"
              : "bg-slate-100 text-slate-500";

          const barFill = isLeader
            ? "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"
            : isSelected
            ? "bg-gradient-to-r from-blue-500 to-blue-400"
            : "bg-gradient-to-r from-slate-400 to-slate-300";

          return (
            <button
              key={it.nome}
              onClick={() => {
                if (modo !== "fornecedor") return;
                onSelectFornecedor(isSelected ? null : it.nome);
              }}
              className={cn(
                "w-full text-left group transition-all rounded-xl p-2.5 -mx-2.5",
                dimmed && "opacity-40",
                isLeader && "bg-blue-50/40 ring-1 ring-blue-100",
                modo !== "fornecedor" && "cursor-default",
                modo === "fornecedor" && !dimmed && "hover:bg-slate-50/80"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div
                  className={cn(
                    "shrink-0 h-7 w-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold tabular-nums",
                    rankStyle
                  )}
                >
                  {rank}º
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={cn(
                        "text-[13.5px] font-semibold truncate",
                        isLeader ? "text-slate-900" : "text-slate-700"
                      )}
                    >
                      {it.nome}
                    </span>
                    <div className="flex items-baseline gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-[10.5px] tabular-nums font-bold uppercase tracking-wider",
                          isLeader ? "text-blue-600" : "text-slate-400"
                        )}
                      >
                        {it.pct.toFixed(1)}%
                      </span>
                      <span
                        className={cn(
                          "text-[13.5px] tabular-nums font-bold text-finance-mono",
                          isLeader ? "text-slate-900" : "text-slate-700"
                        )}
                      >
                        <Money value={it.valor} symbolScale={0.6} />
                      </span>
                    </div>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", barFill)}
                      style={{ width: `${Math.max(it.pct, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedFornecedor && (
        <button
          onClick={() => onSelectFornecedor(null)}
          className="mt-4 text-[11.5px] text-blue-600 font-semibold hover:underline"
        >
          ← Ver todos os fornecedores
        </button>
      )}
    </div>
  );
}
