import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveUnidade } from "./useActiveUnidade";

export type ProfitAlert = {
  id: string;
  nome: string;
  tipo_ficha: string;
  ficha_tecnica_id: string | null;
  cmv_anterior: number;
  cmv_atual: number;
  delta_abs: number;
  delta_pct: number;
  preco_sugerido: number;
  preco_sugerido_p: number | null;
  preco_sugerido_m: number | null;
  preco_sugerido_g: number | null;
  created_at: string;
};

export function useProfitAlerts(limit = 5) {
  const { activeUnidadeId } = useActiveUnidade();

  return useQuery({
    queryKey: ["profit-alerts", activeUnidadeId],
    enabled: !!activeUnidadeId,
    staleTime: 30_000,
    queryFn: async (): Promise<ProfitAlert[]> => {
      const { data, error } = await supabase
        .from("alertas_cmv")
        .select("id, nome_produto, tipo_ficha, ficha_tecnica_id, cmv_anterior, cmv_atual, preco_sugerido, preco_sugerido_p, preco_sugerido_m, preco_sugerido_g, created_at")
        .eq("unidade_id", activeUnidadeId!)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data) return [];

      const alerts = data.map((a) => {
        const prev = Number(a.cmv_anterior) || 0;
        const curr = Number(a.cmv_atual) || 0;
        const delta_abs = curr - prev;
        const delta_pct = prev > 0 ? (delta_abs / prev) * 100 : 0;
        return {
          id: a.id,
          nome: a.nome_produto,
          tipo_ficha: a.tipo_ficha,
          ficha_tecnica_id: a.ficha_tecnica_id,
          cmv_anterior: prev,
          cmv_atual: curr,
          delta_abs,
          delta_pct,
          preco_sugerido: Number(a.preco_sugerido) || 0,
          preco_sugerido_p: a.preco_sugerido_p != null ? Number(a.preco_sugerido_p) : null,
          preco_sugerido_m: a.preco_sugerido_m != null ? Number(a.preco_sugerido_m) : null,
          preco_sugerido_g: a.preco_sugerido_g != null ? Number(a.preco_sugerido_g) : null,
          created_at: a.created_at,
        } as ProfitAlert;
      });

      // Ordena por maior aumento absoluto de CMV
      alerts.sort((a, b) => b.delta_abs - a.delta_abs);
      return alerts.slice(0, limit);
    },
  });
}

export function useDismissProfitAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertas_cmv")
        .update({ status: "ignorado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profit-alerts"] }),
  });
}
