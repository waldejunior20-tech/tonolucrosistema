import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { CATEGORIA_FECHAMENTO, type FormaPagamento } from "./useCaixaDiario";

const FORMA_FROM_CAT: Record<string, FormaPagamento> = {
  "Vendas - Dinheiro/PIX": "Dinheiro/PIX",
  "Vendas - Débito": "Débito",
  "Vendas - Crédito": "Crédito",
  "Vendas - iFood": "iFood",
  "Vendas - Outros Apps": "Outros Apps",
};

export type DiaMovimento = {
  data: string;
  entrada: number;
  saida: number;
  taxas: number;
};

export function useMovimentosCaixa(dias: number, taxas: Record<FormaPagamento, number>) {
  const fromDate = format(subDays(new Date(), dias - 1), "yyyy-MM-dd");
  const toDate = format(new Date(), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["caixa-historico", "movimentos", dias, fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("tipo, categoria, valor, data_lancamento")
        .gte("data_lancamento", fromDate)
        .lte("data_lancamento", toDate)
        .order("data_lancamento", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const map = new Map<string, DiaMovimento>();
  for (const r of query.data ?? []) {
    const d = r.data_lancamento as string;
    const cur = map.get(d) ?? { data: d, entrada: 0, saida: 0, taxas: 0 };
    const v = Number(r.valor) || 0;
    if (r.tipo === "receita") {
      if (r.categoria === CATEGORIA_FECHAMENTO) continue;
      cur.entrada += v;
      const forma = FORMA_FROM_CAT[r.categoria];
      if (forma) cur.taxas += v * ((taxas[forma] ?? 0) / 100);
    } else if (r.tipo === "despesa") {
      cur.saida += v;
    }
    map.set(d, cur);
  }

  const movimentos = Array.from(map.values()).sort((a, b) => b.data.localeCompare(a.data));
  return { movimentos, isLoading: query.isLoading };
}
