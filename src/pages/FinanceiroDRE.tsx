import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CATEGORIAS_RECEITA = ["vendas_balcao", "vendas_delivery", "vendas_ifood", "outras_receitas"];
const CATEGORIAS_DESPESA_SOBRE_VENDAS = ["cmv"];
const CATEGORIAS_DESPESAS_FIXAS = ["custos_fixos", "aluguel", "energia", "agua", "internet", "marketing", "manutencao", "gasolina_delivery", "outros"];
const CATEGORIAS_SALARIOS = ["salarios", "pro_labore"];
const CATEGORIAS_IMPOSTOS = ["impostos"];

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data_lancamento: string;
  pago: boolean;
}

export default function FinanceiroDRE() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const startDate = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lancamentos_financeiros", mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .gte("data_lancamento", startDate)
        .lt("data_lancamento", endDate);
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  const dre = useMemo(() => {
    const sumByCategorias = (categorias: string[], tipo: string) =>
      lancamentos
        .filter((l) => l.tipo === tipo && categorias.includes(l.categoria))
        .reduce((acc, l) => acc + Number(l.valor), 0);

    const receitaBruta = sumByCategorias(CATEGORIAS_RECEITA, "receita");
    const despesasSobreVendas = sumByCategorias(CATEGORIAS_DESPESA_SOBRE_VENDAS, "despesa");
    const receitaLiquida = receitaBruta - despesasSobreVendas;
    const despesasFixas = sumByCategorias(CATEGORIAS_DESPESAS_FIXAS, "despesa");
    const salarios = sumByCategorias(CATEGORIAS_SALARIOS, "despesa");
    const impostos = sumByCategorias(CATEGORIAS_IMPOSTOS, "despesa");
    const margemContribuicao = receitaLiquida - despesasSobreVendas;
    const lucroLiquido = margemContribuicao - despesasFixas - salarios - impostos;

    const pctReceita = (v: number) => (receitaBruta > 0 ? (v / receitaBruta) * 100 : 0);

    // Card "Para cada R$100 vendidos"
    const per100 = receitaBruta > 0
      ? {
          impostos: (impostos / receitaBruta) * 100,
          cmv: (despesasSobreVendas / receitaBruta) * 100,
          despesas: ((despesasFixas + salarios) / receitaBruta) * 100,
          lucro: (lucroLiquido / receitaBruta) * 100,
        }
      : { impostos: 0, cmv: 0, despesas: 0, lucro: 0 };

    return {
      receitaBruta,
      despesasSobreVendas,
      receitaLiquida,
      despesasFixas,
      salarios,
      impostos,
      margemContribuicao,
      lucroLiquido,
      pctReceita,
      per100,
    };
  }, [lancamentos]);

  const dreLines: { label: string; value: number; type: "add" | "sub" | "total" | "pct"; indent?: boolean }[] = [
    { label: "(+) Receita Bruta", value: dre.receitaBruta, type: "add" },
    { label: "(-) CMV e Despesas Variáveis", value: dre.despesasSobreVendas, type: "sub" },
    { label: "(=) Receita Líquida", value: dre.receitaLiquida, type: "total" },
    { label: "    % da Receita", value: dre.pctReceita(dre.receitaLiquida), type: "pct", indent: true },
    { label: "(=) Margem de Contribuição", value: dre.margemContribuicao, type: "total" },
    { label: "    % da Receita", value: dre.pctReceita(dre.margemContribuicao), type: "pct", indent: true },
    { label: "(-) Despesas Fixas", value: dre.despesasFixas, type: "sub" },
    { label: "(-) Salários e Pró-labore", value: dre.salarios, type: "sub" },
    { label: "(-) Impostos", value: dre.impostos, type: "sub" },
    { label: "(=) Lucro Líquido", value: dre.lucroLiquido, type: "total" },
    { label: "    % da Receita", value: dre.pctReceita(dre.lucroLiquido), type: "pct", indent: true },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">DRE — Demonstração do Resultado</h1>
        <div className="flex gap-2">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DRE Cascade */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resultado do Exercício — {MESES[mes - 1]} {ano}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {dreLines.map((line, i) => {
              const isTotal = line.type === "total";
              const isPct = line.type === "pct";
              const isSub = line.type === "sub";

              return (
                <div key={i}>
                  {isTotal && <Separator className="my-2" />}
                  <div
                    className={`flex items-center justify-between py-1.5 px-3 rounded-md text-sm ${
                      isTotal
                        ? "bg-muted font-bold text-foreground"
                        : isPct
                        ? "text-muted-foreground text-xs"
                        : isSub
                        ? "text-foreground/80"
                        : "text-foreground"
                    } ${line.indent ? "pl-8" : ""}`}
                  >
                    <span>{line.label}</span>
                    <span
                      className={
                        isTotal
                          ? line.value >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : isPct
                          ? "text-muted-foreground"
                          : ""
                      }
                    >
                      {isPct ? fmtPct(line.value) : fmt(line.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Para cada R$100 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Para cada R$100 vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Impostos", value: dre.per100.impostos, color: "text-red-500" },
                { label: "CMV", value: dre.per100.cmv, color: "text-orange-500" },
                { label: "Despesas fixas + variáveis", value: dre.per100.despesas, color: "text-yellow-600" },
                { label: "Lucro líquido", value: dre.per100.lucro, color: dre.per100.lucro >= 0 ? "text-green-600" : "text-red-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground/80">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>
                    R$ {item.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Margem de Contribuição */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Margem de Contribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${dre.margemContribuicao >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(dre.margemContribuicao)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {fmtPct(dre.pctReceita(dre.margemContribuicao))} da receita bruta
            </p>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground italic">
              Sobrou para pagar despesas fixas e gerar lucro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lucro Líquido highlight */}
      <Card className={dre.lucroLiquido >= 0 ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {dre.lucroLiquido >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-600" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Lucro Líquido do Mês</p>
              <p className={`text-3xl font-bold ${dre.lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(dre.lucroLiquido)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
