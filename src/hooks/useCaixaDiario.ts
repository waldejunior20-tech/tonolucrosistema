import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type FormaPagamento = "Dinheiro/PIX" | "Débito" | "Crédito" | "iFood" | "Outros Apps";

export type LancamentoCaixa = {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
  data_lancamento: string;
  created_at: string;
};

export type BreakdownForma = {
  forma: FormaPagamento;
  bruto: number;
  liquido: number;
  taxaPct: number;
  count: number;
};

const FORMA_FROM_CAT: Record<string, FormaPagamento> = {
  "Vendas - Dinheiro/PIX": "Dinheiro/PIX",
  "Vendas - Débito": "Débito",
  "Vendas - Crédito": "Crédito",
  "Vendas - iFood": "iFood",
  "Vendas - Outros Apps": "Outros Apps",
};

export const CATEGORIA_FECHAMENTO = "Fechamento de Caixa";

export function useCaixaDiario(date: Date) {
  const dataStr = format(date, "yyyy-MM-dd");

  const lancamentosQuery = useQuery({
    queryKey: ["caixa-diario", dataStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("id, categoria, descricao, valor, data_lancamento, created_at")
        .eq("data_lancamento", dataStr)
        .eq("tipo", "receita")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LancamentoCaixa[];
    },
  });

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

  const lancamentos = lancamentosQuery.data ?? [];
  const config = configQuery.data;

  const taxas: Record<FormaPagamento, number> = {
    "Dinheiro/PIX": config?.taxa_pix_pct ?? 0,
    "Débito": config?.taxa_debito_pct ?? 1.35,
    "Crédito": config?.taxa_credito_pct ?? 3.15,
    "iFood": config?.taxa_ifood_pct ?? 12,
    "Outros Apps": 0,
  };

  // Filter out fechamento marker entries from breakdown
  const vendas = lancamentos.filter((l) => l.categoria !== CATEGORIA_FECHAMENTO);
  const isClosed = lancamentos.some((l) => l.categoria === CATEGORIA_FECHAMENTO);

  const breakdown: BreakdownForma[] = (
    ["Dinheiro/PIX", "Débito", "Crédito", "iFood", "Outros Apps"] as FormaPagamento[]
  ).map((forma) => {
    const items = vendas.filter((l) => FORMA_FROM_CAT[l.categoria] === forma);
    const bruto = items.reduce((s, l) => s + Number(l.valor), 0);
    const taxaPct = taxas[forma];
    const liquido = bruto * (1 - taxaPct / 100);
    return { forma, bruto, liquido, taxaPct, count: items.length };
  });

  const totalBruto = breakdown.reduce((s, b) => s + b.bruto, 0);
  const totalLiquido = breakdown.reduce((s, b) => s + b.liquido, 0);
  const totalTaxas = totalBruto - totalLiquido;
  const totalVendas = vendas.length;

  return {
    lancamentos: vendas,
    breakdown,
    totalBruto,
    totalLiquido,
    totalTaxas,
    totalVendas,
    isClosed,
    isLoading: lancamentosQuery.isLoading,
    taxas,
    dataStr,
  };
}
