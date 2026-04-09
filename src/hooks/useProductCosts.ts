import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { converterQuantidade } from "@/lib/pricing-helpers";

export interface ProductItem {
  id: string;
  nome: string;
  tipo: "pizza" | "produto" | "bebida";
  categoria?: string;
  custo: number;
  precoVenda: number;
  tamanho?: "P" | "M" | "G";
}

export function useProductCosts() {
  const { data: fichasPizza = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_pizza").select("*").order("nome");
      return data ?? [];
    },
  });

  const { data: ingredientesPizza = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza_ingredientes"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_pizza_ingredientes").select("*");
      return data ?? [];
    },
  });

  const { data: fichasProdutos = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos", "all"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_produtos").select("*").order("nome");
      return data ?? [];
    },
  });

  const { data: ingredientesProdutos = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos_ingredientes"],
    queryFn: async () => {
      const { data } = await supabase.from("fichas_tecnicas_produtos_ingredientes").select("*");
      return data ?? [];
    },
  });

  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_comprados").select("*");
      return data ?? [];
    },
  });

  const { data: insumosProprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_proprios").select("*");
      return data ?? [];
    },
  });

  const { data: ingredientesProprios = [] } = useQuery({
    queryKey: ["insumos_proprios_ingredientes"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_proprios_ingredientes").select("*");
      return data ?? [];
    },
  });

  const { data: precificacaoBebidas = [] } = useQuery({
    queryKey: ["precificacao_bebidas"],
    queryFn: async () => {
      const { data } = await supabase.from("precificacao_bebidas").select("*");
      return data ?? [];
    },
  });

  const { data: precificacaoProdutos = [] } = useQuery({
    queryKey: ["precificacao_produtos"],
    queryFn: async () => {
      const { data } = await supabase.from("precificacao_produtos").select("*");
      return data ?? [];
    },
  });

  const custoCompradoMap = useMemo(() => {
    const m = new Map<string, number>();
    insumosComprados.forEach((ic) => m.set(ic.id, Number(ic.preco_pago) / Number(ic.quantidade)));
    return m;
  }, [insumosComprados]);

  const custoProprioMap = useMemo(() => {
    const m = new Map<string, number>();
    insumosProprios.forEach((ip) => {
      const ings = ingredientesProprios.filter((i) => i.insumo_proprio_id === ip.id);
      const custoTotal = ings.reduce((acc, ing) => {
        const custoUnit = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
        return acc + custoUnit * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      m.set(ip.id, Number(ip.rendimento) > 0 ? custoTotal / Number(ip.rendimento) : 0);
    });
    return m;
  }, [insumosProprios, ingredientesProprios, custoCompradoMap]);

  // All available products with costs
  const allProducts = useMemo<ProductItem[]>(() => {
    const items: ProductItem[] = [];

    // Pizzas (P/M/G)
    fichasPizza.forEach((f) => {
      const ings = ingredientesPizza.filter((i) => i.ficha_id === f.id);
      const calcCost = (size: "p" | "m" | "g") => {
        let cost = 0;
        ings.forEach((ing) => {
          const qtyKey = `qtd_${size}` as "qtd_p" | "qtd_m" | "qtd_g";
          if (ing.tipo_insumo.startsWith("embalagem_")) {
            if (ing.tipo_insumo === `embalagem_${size}`) {
              cost += (custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0) * Number(ing[qtyKey] ?? 0);
            }
          } else {
            const custoUnit = ing.tipo_insumo === "comprado"
              ? custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0
              : custoProprioMap.get(ing.insumo_proprio_id ?? "") ?? 0;
            cost += custoUnit * converterQuantidade(Number(ing[qtyKey] ?? 0), ing.unidade);
          }
        });
        return cost;
      };

      const sizes: Array<{ size: "P" | "M" | "G"; key: "p" | "m" | "g"; precoKey: "preco_venda_p" | "preco_venda_m" | "preco_venda_g" }> = [
        { size: "P", key: "p", precoKey: "preco_venda_p" },
        { size: "M", key: "m", precoKey: "preco_venda_m" },
        { size: "G", key: "g", precoKey: "preco_venda_g" },
      ];

      sizes.forEach(({ size, key, precoKey }) => {
        items.push({
          id: f.id,
          nome: f.nome,
          tipo: "pizza",
          categoria: f.tipo ?? "tradicional",
          custo: calcCost(key),
          precoVenda: Number(f[precoKey] ?? 0),
          tamanho: size,
        });
      });
    });

    // Produtos
    fichasProdutos.forEach((f) => {
      const ings = ingredientesProdutos.filter((i) => i.ficha_id === f.id);
      const custo = ings.reduce((acc, ing) => {
        const custoUnit = ing.tipo_insumo === "comprado"
          ? custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0
          : custoProprioMap.get(ing.insumo_proprio_id ?? "") ?? 0;
        return acc + custoUnit * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      const prec = precificacaoProdutos.find((p) => p.ficha_id === f.id);
      items.push({
        id: f.id,
        nome: f.nome,
        tipo: "produto",
        categoria: f.categoria,
        custo,
        precoVenda: Number(prec?.preco_venda ?? f.preco_venda ?? 0),
      });
    });

    // Bebidas industrializadas
    const bebidasInsumos = insumosComprados.filter((i) => i.categoria === "Bebidas");
    bebidasInsumos.forEach((insumo) => {
      const prec = precificacaoBebidas.find((p) => p.insumo_comprado_id === insumo.id);
      const custoUnit = Number(insumo.preco_pago) / Number(insumo.quantidade);
      items.push({
        id: insumo.id,
        nome: insumo.nome,
        tipo: "bebida",
        categoria: "Bebidas",
        custo: custoUnit,
        precoVenda: Number(prec?.preco_venda ?? 0),
      });
    });

    return items;
  }, [fichasPizza, ingredientesPizza, fichasProdutos, ingredientesProdutos, insumosComprados, precificacaoBebidas, precificacaoProdutos, custoCompradoMap, custoProprioMap]);

  // Unique products for picker (without size duplication for pizzas - just show once)
  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return allProducts.filter((p) => {
      const key = p.tipo === "pizza" ? `pizza-${p.id}` : `${p.tipo}-${p.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allProducts]);

  const getProductById = (id: string, tipo: string) => {
    return allProducts.filter((p) => p.id === id && p.tipo === tipo);
  };

  return { allProducts, uniqueProducts, getProductById };
}
