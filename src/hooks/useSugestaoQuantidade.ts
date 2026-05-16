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
      const { data, error } = await supabase
        .from("ficha_ingredientes")
        .select("qtd_p, qtd_m, qtd_g, insumos(nome, categoria)")
        .not("qtd_p", "is", null)
        .not("qtd_m", "is", null)
        .not("qtd_g", "is", null)
        .limit(1000);

      if (error || !data) return [];

      return data
        .map((row: any) => {
          const nome = row.insumos?.nome ?? "";
          const categoria = row.insumos?.categoria ?? null;
          return {
            grupoComportamento: inferirGrupoComportamento(nome, categoria),
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
