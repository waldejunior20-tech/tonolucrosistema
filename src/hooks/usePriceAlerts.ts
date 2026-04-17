import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PriceAlert = {
  nome: string;
  precoAnterior: number;
  precoAtual: number;
  variacaoPct: number;
  unidade: string;
  dataAtual: string | null;
};

const THRESHOLD_PCT = 5;

/**
 * Detecta insumos cujo preço unitário (preco_pago / quantidade) subiu mais de 5%
 * entre as duas compras mais recentes (agrupando por nome).
 */
export function usePriceAlerts() {
  return useQuery({
    queryKey: ["price-alerts"],
    staleTime: 60_000,
    queryFn: async (): Promise<PriceAlert[]> => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("nome, preco_pago, quantidade, unidade, data_compra, created_at")
        .order("data_compra", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!data) return [];

      // Agrupa por nome (case-insensitive, trim) mantendo ordem (mais recente primeiro)
      const groups = new Map<string, typeof data>();
      for (const row of data) {
        const key = row.nome.trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      const alerts: PriceAlert[] = [];
      for (const compras of groups.values()) {
        if (compras.length < 2) continue;

        const atual = compras[0];
        const anterior = compras[1];

        const qtdAtual = Number(atual.quantidade);
        const qtdAnterior = Number(anterior.quantidade);
        if (qtdAtual <= 0 || qtdAnterior <= 0) continue;

        const unitAtual = Number(atual.preco_pago) / qtdAtual;
        const unitAnterior = Number(anterior.preco_pago) / qtdAnterior;
        if (unitAnterior <= 0) continue;

        const variacao = ((unitAtual - unitAnterior) / unitAnterior) * 100;

        if (variacao > THRESHOLD_PCT) {
          alerts.push({
            nome: atual.nome,
            precoAnterior: unitAnterior,
            precoAtual: unitAtual,
            variacaoPct: variacao,
            unidade: atual.unidade,
            dataAtual: atual.data_compra,
          });
        }
      }

      // Ordena por maior variação primeiro
      alerts.sort((a, b) => b.variacaoPct - a.variacaoPct);
      return alerts.slice(0, 5); // limita a 5 mais críticos
    },
  });
}
