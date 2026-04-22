import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveUnidadeId, requireActiveUnidadeId } from "@/hooks/useActiveUnidade";

export type TipoFicha = "pizza" | "produto";

export interface BaseIngredienteInput {
  tipo_insumo: "comprado" | "proprio" | "embalagem_p" | "embalagem_m" | "embalagem_g";
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  qtd_p?: number;
  qtd_m?: number;
  qtd_g?: number;
  quantidade?: number;
  unidade: string;
}

/**
 * Lista as bases de ficha da unidade ativa.
 */
export function useBasesFicha(tipoFicha: TipoFicha) {
  const unidadeId = getActiveUnidadeId();
  return useQuery({
    queryKey: ["bases_ficha", unidadeId, tipoFicha],
    queryFn: async () => {
      if (!unidadeId) return [];
      const { data, error } = await supabase
        .from("bases_ficha")
        .select(
          "*, ingredientes:bases_ficha_ingredientes(*, insumo_comprado:insumos_comprados(id,nome), insumo_proprio:insumos_proprios(id,nome))",
        )
        .eq("unidade_id", unidadeId)
        .eq("tipo_ficha", tipoFicha)
        .order("is_padrao", { ascending: false })
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!unidadeId,
  });
}

/**
 * Aplica uma base em uma ficha (copia ingredientes via RPC).
 * Retorna a quantidade de ingredientes inseridos.
 */
export function useAplicarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      baseId,
      fichaId,
      tipoFicha,
    }: {
      baseId: string;
      fichaId: string;
      tipoFicha: TipoFicha;
    }) => {
      const { data, error } = await supabase.rpc("aplicar_base_em_ficha", {
        p_base_id: baseId,
        p_ficha_id: fichaId,
        p_tipo_ficha: tipoFicha,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza_ingredientes"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos_ingredientes"] });
    },
  });
}

/**
 * Cria uma base nova a partir de uma lista de ingredientes do form.
 */
export function useSalvarComoBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      nome: string;
      descricao?: string;
      tipoFicha: TipoFicha;
      isPadrao?: boolean;
      ingredientes: BaseIngredienteInput[];
    }) => {
      const unidade_id = requireActiveUnidadeId();
      const { data: base, error: e1 } = await supabase
        .from("bases_ficha")
        .insert({
          nome: params.nome,
          descricao: params.descricao ?? null,
          tipo_ficha: params.tipoFicha,
          is_padrao: params.isPadrao ?? false,
          unidade_id,
        })
        .select()
        .single();
      if (e1) throw e1;

      if (params.ingredientes.length > 0) {
        const rows = params.ingredientes.map((ing, i) => ({
          base_id: base.id,
          tipo_insumo: ing.tipo_insumo,
          insumo_comprado_id: ing.insumo_comprado_id,
          insumo_proprio_id: ing.insumo_proprio_id,
          qtd_p: ing.qtd_p ?? 0,
          qtd_m: ing.qtd_m ?? 0,
          qtd_g: ing.qtd_g ?? 0,
          quantidade: ing.quantidade ?? null,
          unidade: ing.unidade,
          ordem: i,
          unidade_id,
        }));
        const { error: e2 } = await supabase.from("bases_ficha_ingredientes").insert(rows);
        if (e2) throw e2;
      }
      return base;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bases_ficha"] });
    },
  });
}

export function useDeletarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (baseId: string) => {
      const { error } = await supabase.from("bases_ficha").delete().eq("id", baseId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bases_ficha"] }),
  });
}
