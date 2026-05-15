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

export function useCaixaPeriodo(dias: number) {
  const fromDate = format(subDays(new Date(), dias - 1), "yyyy-MM-dd");
  const toDate = format(new Date(), "yyyy-MM-dd");

  const configQuery = useQuery({
    queryKey: ["config-precificacao-caixa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes_precificacao")
        .select("taxa_pix_pct, taxa_debito_pct, taxa_credito_pct, taxa_ifood_pct")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const config = configQuery.data;
  const taxas: Record<FormaPagamento, number> = {
    "Dinheiro/PIX": config?.taxa_pix_pct ?? 0,
    "Débito": config?.taxa_debito_pct ?? 1.35,
    "Crédito": config?.taxa_credito_pct ?? 3.15,
    "iFood": config?.taxa_ifood_pct ?? 12,
    "Outros Apps": 0,
  };

  const query = useQuery({
    queryKey: ["caixa-periodo", dias, fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("tipo, categoria, valor, data_lancamento")
        .gte("data_lancamento", fromDate)
        .lte("data_lancamento", toDate);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = query.data ?? [];
  let totalGanho = 0;
  let totalGasto = 0;
  let totalTaxas = 0;
  let qtdVendas = 0;

  for (const r of rows) {
    const v = Number(r.valor) || 0;
    if (r.tipo === "receita") {
      if (r.categoria === CATEGORIA_FECHAMENTO) continue;
      totalGanho += v;
      qtdVendas += 1;
      const forma = FORMA_FROM_CAT[r.categoria];
      if (forma) {
        const taxaPct = taxas[forma];
        totalTaxas += v * (taxaPct / 100);
      }
    } else if (r.tipo === "despesa") {
      totalGasto += v;
    }
  }

  const totalLiquido = totalGanho - totalTaxas;

  return {
    totalGanho,
    totalGasto,
    totalTaxas,
    totalLiquido,
    qtdVendas,
    fromDate,
    toDate,
    isLoading: query.isLoading,
  };
}
