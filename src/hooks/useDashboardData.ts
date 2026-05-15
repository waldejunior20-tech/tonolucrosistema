import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, subMonths, subDays, format } from "date-fns";

export function useDashboardData() {
  const now = new Date();
  const mesAtual = startOfMonth(now);
  const fimMes = endOfMonth(now);

  const { data: totalFichasPizza = 0 } = useQuery({
    queryKey: ["dashboard-fichas-pizza-count"],
    queryFn: async () => {
      const { count } = await supabase.from("fichas_tecnicas_pizza").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalFichasProdutos = 0 } = useQuery({
    queryKey: ["dashboard-fichas-produtos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("fichas_tecnicas_produtos").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalInsumos = 0 } = useQuery({
    queryKey: ["dashboard-insumos-count"],
    queryFn: async () => {
      const { count } = await supabase.from("insumos_comprados").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalInsumosProprios = 0 } = useQuery({
    queryKey: ["dashboard-insumos-proprios-count"],
    queryFn: async () => {
      const { count } = await supabase.from("insumos_proprios").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: promocoesAtivas = 0 } = useQuery({
    queryKey: ["dashboard-promocoes-ativas-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("promocoes")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativa");
      return count ?? 0;
    },
  });

  // Lançamentos do mês atual
  const { data: lancamentosMes = [] } = useQuery({
    queryKey: ["dashboard-lancamentos-mes", format(mesAtual, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("tipo, valor, categoria")
        .gte("data_lancamento", format(mesAtual, "yyyy-MM-dd"))
        .lte("data_lancamento", format(fimMes, "yyyy-MM-dd"));
      return data ?? [];
    },
  });

  // Lançamentos dos últimos 6 meses para gráfico
  const { data: lancamentos6Meses = [] } = useQuery({
    queryKey: ["dashboard-lancamentos-6meses"],
    queryFn: async () => {
      const inicio = startOfMonth(subMonths(now, 5));
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("tipo, valor, data_lancamento")
        .gte("data_lancamento", format(inicio, "yyyy-MM-dd"))
        .lte("data_lancamento", format(fimMes, "yyyy-MM-dd"));
      return data ?? [];
    },
  });

  // Contas a pagar vencendo (próximos 7 dias)
  const { data: contasVencendo = [] } = useQuery({
    queryKey: ["dashboard-contas-vencendo-7d"],
    queryFn: async () => {
      const hoje = format(now, "yyyy-MM-dd");
      const em7dias = format(new Date(now.getTime() + 7 * 86400000), "yyyy-MM-dd");
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("descricao, valor, data_lancamento")
        .eq("tipo", "despesa")
        .eq("pago", false)
        .lte("data_lancamento", em7dias)
        .gte("data_lancamento", hoje)
        .order("data_lancamento")
        .limit(10);
      return data ?? [];
    },
  });

  // Contas a pagar nos últimos 7 dias (despesas não pagas)
  const { data: contasPagar7Dias = [] } = useQuery({
    queryKey: ["dashboard-contas-pagar-7dias"],
    queryFn: async () => {
      const hoje = format(now, "yyyy-MM-dd");
      const ha7dias = format(subDays(now, 6), "yyyy-MM-dd");
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("descricao, valor, data_lancamento")
        .eq("tipo", "despesa")
        .eq("pago", false)
        .gte("data_lancamento", ha7dias)
        .lte("data_lancamento", hoje)
        .order("data_lancamento")
        .limit(5);
      return data ?? [];
    },
  });

  // Configurações de precificação (CMV meta)
  const { data: configPrec } = useQuery({
    queryKey: ["dashboard-config-precificacao"],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes_precificacao")
        .select("cmv_meta_pct")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Cálculos
  const faturamentoMes = useMemo(
    () => lancamentosMes.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosMes]
  );

  const despesasMes = useMemo(
    () => lancamentosMes.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosMes]
  );

  const cmvMes = useMemo(
    () =>
      lancamentosMes
        .filter((l) => l.tipo === "despesa" && (l.categoria === "CMV" || l.categoria === "Insumos"))
        .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosMes]
  );

  const cmvPct = faturamentoMes > 0 ? (cmvMes / faturamentoMes) * 100 : 0;
  const cmvMeta = configPrec?.cmv_meta_pct ?? 32;

  // ─── Comparativos com o mês anterior ───
  const mesAnteriorInicio = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
  const mesAnteriorFim = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

  const lancamentosMesAnterior = useMemo(
    () =>
      lancamentos6Meses.filter(
        (l) => l.data_lancamento >= mesAnteriorInicio && l.data_lancamento <= mesAnteriorFim,
      ),
    [lancamentos6Meses, mesAnteriorInicio, mesAnteriorFim],
  );

  const faturamentoMesAnterior = useMemo(
    () =>
      lancamentosMesAnterior
        .filter((l) => l.tipo === "receita")
        .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosMesAnterior],
  );

  const despesasMesAnterior = useMemo(
    () =>
      lancamentosMesAnterior
        .filter((l) => l.tipo === "despesa")
        .reduce((s, l) => s + Number(l.valor), 0),
    [lancamentosMesAnterior],
  );

  const lucroMes = faturamentoMes - despesasMes;
  const lucroMesAnterior = faturamentoMesAnterior - despesasMesAnterior;

  // Variação percentual (null = sem base de comparação)
  function variacao(atual: number, anterior: number): number | null {
    if (anterior === 0) return atual === 0 ? 0 : null;
    return ((atual - anterior) / Math.abs(anterior)) * 100;
  }

  const comparativos = {
    faturamento: variacao(faturamentoMes, faturamentoMesAnterior),
    despesas: variacao(despesasMes, despesasMesAnterior),
    lucro: variacao(lucroMes, lucroMesAnterior),
  };

  // Gráfico de faturamento por mês (últimos 6 meses)
  const graficoMensal = useMemo(() => {
    const meses: { mes: string; receita: number; despesa: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, "MMM");
      const inicio = format(startOfMonth(d), "yyyy-MM-dd");
      const fim = format(endOfMonth(d), "yyyy-MM-dd");
      const receita = lancamentos6Meses
        .filter((l) => l.tipo === "receita" && l.data_lancamento >= inicio && l.data_lancamento <= fim)
        .reduce((s, l) => s + Number(l.valor), 0);
      const despesa = lancamentos6Meses
        .filter((l) => l.tipo === "despesa" && l.data_lancamento >= inicio && l.data_lancamento <= fim)
        .reduce((s, l) => s + Number(l.valor), 0);
      meses.push({ mes: label, receita, despesa });
    }
    return meses;
  }, [lancamentos6Meses]);

  const totalFichas = totalFichasPizza + totalFichasProdutos;

  return {
    totalFichas,
    totalFichasPizza,
    totalFichasProdutos,
    totalInsumos: totalInsumos + totalInsumosProprios,
    promocoesAtivas,
    faturamentoMes,
    despesasMes,
    faturamentoMesAnterior,
    despesasMesAnterior,
    lucroMesAnterior,
    comparativos,
    cmvPct,
    cmvMeta,
    graficoMensal,
    contasVencendo,
    contasPagar7Dias,
  };
}

