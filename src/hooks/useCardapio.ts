import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CardapioItem = {
  tipo: "pizza" | "produto" | "bebida";
  ficha_pizza_id?: string;
  ficha_produto_id?: string;
  insumo_bebida_id?: string;
  nome: string;
  categoria: string;
  // pizza tem 3 preços; produto/bebida tem 1
  preco_p?: number;
  preco_m?: number;
  preco_g?: number;
  preco?: number;
};

export function useCardapio() {
  return useQuery({
    queryKey: ["cardapio"],
    staleTime: 30_000,
    queryFn: async (): Promise<CardapioItem[]> => {
      const items: CardapioItem[] = [];

      // Pizzas
      const { data: pizzas } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("id, nome, tipo, preco_venda_p, preco_venda_m, preco_venda_g")
        .order("nome");
      for (const p of pizzas ?? []) {
        const pp = Number(p.preco_venda_p ?? 0);
        const pm = Number(p.preco_venda_m ?? 0);
        const pg = Number(p.preco_venda_g ?? 0);
        if (pp > 0 || pm > 0 || pg > 0) {
          items.push({
            tipo: "pizza",
            ficha_pizza_id: p.id,
            nome: p.nome,
            categoria: p.tipo ?? "Pizza",
            preco_p: pp, preco_m: pm, preco_g: pg,
          });
        }
      }

      // Produtos com preço (via precificacao_produtos)
      const { data: produtos } = await supabase
        .from("precificacao_produtos")
        .select("id, preco_venda, ficha_id, fichas_tecnicas_produtos!inner(id, nome, categoria)")
        .gt("preco_venda", 0);
      for (const pp of (produtos ?? []) as any[]) {
        items.push({
          tipo: "produto",
          ficha_produto_id: pp.ficha_id,
          nome: pp.fichas_tecnicas_produtos.nome,
          categoria: pp.fichas_tecnicas_produtos.categoria,
          preco: Number(pp.preco_venda),
        });
      }

      // Bebidas (via precificacao_bebidas → insumos_comprados)
      const { data: bebidas } = await supabase
        .from("precificacao_bebidas")
        .select("id, preco_venda, insumo_comprado_id, insumos_comprados!inner(id, nome, categoria)")
        .gt("preco_venda", 0);
      for (const b of (bebidas ?? []) as any[]) {
        items.push({
          tipo: "bebida",
          insumo_bebida_id: b.insumo_comprado_id,
          nome: b.insumos_comprados.nome,
          categoria: b.insumos_comprados.categoria || "Bebidas",
          preco: Number(b.preco_venda),
        });
      }

      return items.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}
