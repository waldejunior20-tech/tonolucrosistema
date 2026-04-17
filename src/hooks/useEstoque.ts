import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EstoqueItem = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  status: "ok" | "baixo" | "zerado";
};

export type Movimento = {
  id: string;
  insumo_id: string;
  tipo: "entrada" | "saida" | "ajuste";
  quantidade: number;
  unidade: string;
  motivo: string | null;
  data_movimento: string;
};

export function useEstoque() {
  return useQuery({
    queryKey: ["estoque"],
    queryFn: async (): Promise<EstoqueItem[]> => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("id, nome, categoria, unidade, estoque_atual, estoque_minimo")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((i: any) => {
        const atual = Number(i.estoque_atual);
        const min = Number(i.estoque_minimo);
        let status: EstoqueItem["status"] = "ok";
        if (atual <= 0) status = "zerado";
        else if (min > 0 && atual < min) status = "baixo";
        return { ...i, estoque_atual: atual, estoque_minimo: min, status };
      });
    },
    staleTime: 30_000,
  });
}

export function useMovimentos(insumoId: string | null) {
  return useQuery({
    queryKey: ["estoque-movimentos", insumoId],
    enabled: !!insumoId,
    queryFn: async (): Promise<Movimento[]> => {
      const { data, error } = await (supabase as any)
        .from("estoque_movimentos")
        .select("id, insumo_id, tipo, quantidade, unidade, motivo, data_movimento")
        .eq("insumo_id", insumoId)
        .order("data_movimento", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Movimento[];
    },
  });
}

export function useEstoqueAlertas() {
  return useQuery({
    queryKey: ["estoque-alertas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("id, nome, estoque_atual, estoque_minimo, unidade")
        .gt("estoque_minimo", 0);
      if (error) throw error;
      return (data ?? []).filter((i: any) => Number(i.estoque_atual) < Number(i.estoque_minimo));
    },
    staleTime: 60_000,
  });
}
