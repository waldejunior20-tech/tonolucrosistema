import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useProductCosts } from "@/hooks/useProductCosts";

export type RankingItem = {
  key: string;
  nome: string;
  tipo: "pizza" | "produto" | "bebida";
  tamanho?: "P" | "M" | "G" | null;
  quantidade: number;
  receita: number;
  custo: number;
  lucro: number;
  margemPct: number; // lucro / receita * 100
};

export type RankingSummary = {
  itens: RankingItem[];
  top5: RankingItem[];
  totalReceita: number;
  totalCusto: number;
  totalLucro: number;
  cmvRealPct: number;
};

export function useRankingProdutos(referenceDate: Date = new Date()): RankingSummary & { isLoading: boolean } {
  const inicio = format(startOfMonth(referenceDate), "yyyy-MM-dd");
  const fim = format(endOfMonth(referenceDate), "yyyy-MM-dd");

  const { allProducts } = useProductCosts();

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["ranking-vendas-itens", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_itens")
        .select("tipo_produto, ficha_pizza_id, ficha_produto_id, insumo_bebida_id, tamanho_pizza, nome_produto, quantidade, preco_unitario, subtotal, vendas!inner(data_venda)")
        .gte("vendas.data_venda", inicio)
        .lte("vendas.data_venda", fim);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return useMemo(() => {
    // Map: key -> aggregate
    const map = new Map<string, RankingItem>();

    for (const it of itens) {
      const tipo = it.tipo_produto as "pizza" | "produto" | "bebida";
      const id =
        tipo === "pizza" ? it.ficha_pizza_id :
        tipo === "produto" ? it.ficha_produto_id :
        it.insumo_bebida_id;
      if (!id) continue;

      const tamanho = (it.tamanho_pizza ?? null) as "P" | "M" | "G" | null;
      const key = `${tipo}-${id}-${tamanho ?? ""}`;

      // custo unitário a partir do useProductCosts (mesma lógica de precificação)
      const product = allProducts.find((p) =>
        p.tipo === tipo && p.id === id && (tipo !== "pizza" || p.tamanho === tamanho),
      );
      const custoUnit = product?.custo ?? 0;
      const qtd = Number(it.quantidade);
      const subtotal = Number(it.subtotal);

      const existing = map.get(key);
      if (existing) {
        existing.quantidade += qtd;
        existing.receita += subtotal;
        existing.custo += custoUnit * qtd;
      } else {
        map.set(key, {
          key,
          nome: it.nome_produto,
          tipo,
          tamanho,
          quantidade: qtd,
          receita: subtotal,
          custo: custoUnit * qtd,
          lucro: 0,
          margemPct: 0,
        });
      }
    }

    const arr = Array.from(map.values()).map((r) => {
      r.lucro = r.receita - r.custo;
      r.margemPct = r.receita > 0 ? (r.lucro / r.receita) * 100 : 0;
      return r;
    });

    arr.sort((a, b) => b.quantidade - a.quantidade);

    const totalReceita = arr.reduce((s, r) => s + r.receita, 0);
    const totalCusto = arr.reduce((s, r) => s + r.custo, 0);
    const totalLucro = totalReceita - totalCusto;
    const cmvRealPct = totalReceita > 0 ? (totalCusto / totalReceita) * 100 : 0;

    return {
      itens: arr,
      top5: arr.slice(0, 5),
      totalReceita,
      totalCusto,
      totalLucro,
      cmvRealPct,
      isLoading,
    };
  }, [itens, allProducts, isLoading]);
}
