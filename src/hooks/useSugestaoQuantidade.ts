import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  sugerirQuantidades,
  inferirGrupoComportamento,
  type HistoricoItem,
  type GrupoComportamento,
  type Sugestao,
} from "@/lib/sugestao-quantidade";

/**
 * Carrega o histórico de ingredientes já cadastrados em fichas de pizza
 * e expõe uma função `sugerir(nome, qtdP, categoria?)` que retorna {qtdM, qtdG}.
 */
export function useSugestaoQuantidade() {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-ingredientes-pizza"],
    queryFn: async (): Promise<HistoricoItem[]> => {
      const [ingRes, compRes, propRes] = await Promise.all([
        supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .select("qtd_p, qtd_m, qtd_g, insumo_comprado_id, insumo_proprio_id")
          .not("qtd_p", "is", null)
          .not("qtd_m", "is", null)
          .not("qtd_g", "is", null)
          .limit(1000),
        supabase.from("insumos_comprados").select("id, nome, categoria"),
        supabase.from("insumos_proprios").select("id, nome, categoria"),
      ]);

      const ingredientes = ingRes.data ?? [];
      const mapComp = new Map<string, { nome: string; categoria: string | null }>();
      (compRes.data ?? []).forEach((i: any) =>
        mapComp.set(i.id, { nome: i.nome ?? "", categoria: i.categoria ?? null }),
      );
      const mapProp = new Map<string, { nome: string; categoria: string | null }>();
      (propRes.data ?? []).forEach((i: any) =>
        mapProp.set(i.id, { nome: i.nome ?? "", categoria: i.categoria ?? null }),
      );

      return ingredientes
        .map((row: any) => {
          const info =
            (row.insumo_comprado_id && mapComp.get(row.insumo_comprado_id)) ||
            (row.insumo_proprio_id && mapProp.get(row.insumo_proprio_id)) ||
            { nome: "", categoria: null };
          return {
            grupoComportamento: inferirGrupoComportamento(info.nome, info.categoria),
            qtdP: Number(row.qtd_p) || 0,
            qtdM: Number(row.qtd_m) || 0,
            qtdG: Number(row.qtd_g) || 0,
          };
        })
        .filter((h) => h.qtdP > 0 && h.qtdM > 0 && h.qtdG > 0);
    },
    staleTime: 5 * 60 * 1000,
  });

  const sugerir = useMemo(
    () =>
      (
        nome: string,
        qtdP: number,
        categoria?: string | null,
        grupoForcado?: GrupoComportamento,
      ): Sugestao => {
        const grupo = grupoForcado ?? inferirGrupoComportamento(nome, categoria);
        return sugerirQuantidades(grupo, qtdP, historico);
      },
    [historico],
  );

  return { sugerir, isLoading, historico };
}
