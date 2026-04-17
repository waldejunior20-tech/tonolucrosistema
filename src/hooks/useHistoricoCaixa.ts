import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { CATEGORIA_FECHAMENTO } from "./useCaixaDiario";

export type DiaHistorico = {
  data: string; // yyyy-MM-dd
  totalBruto: number;
  qtdVendas: number;
  fechado: boolean;
};

export function useHistoricoCaixa(dias: number = 30) {
  return useQuery({
    queryKey: ["caixa-historico", dias],
    queryFn: async (): Promise<DiaHistorico[]> => {
      const fromDate = format(subDays(new Date(), dias), "yyyy-MM-dd");
      const toDate = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("data_lancamento, valor, categoria")
        .eq("tipo", "receita")
        .gte("data_lancamento", fromDate)
        .lte("data_lancamento", toDate)
        .order("data_lancamento", { ascending: false });

      if (error) throw error;

      const map = new Map<string, DiaHistorico>();
      for (const row of data ?? []) {
        const d = row.data_lancamento as string;
        const isFechamento = row.categoria === CATEGORIA_FECHAMENTO;
        const cur = map.get(d) ?? { data: d, totalBruto: 0, qtdVendas: 0, fechado: false };
        if (isFechamento) {
          cur.fechado = true;
        } else {
          cur.totalBruto += Number(row.valor);
          cur.qtdVendas += 1;
        }
        map.set(d, cur);
      }

      return Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
    },
    staleTime: 30_000,
  });
}
