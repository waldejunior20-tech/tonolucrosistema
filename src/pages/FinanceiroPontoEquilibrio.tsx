import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertTriangle, Info } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CATEGORIAS_RECEITA = ["vendas_balcao", "vendas_delivery", "vendas_ifood", "outras_receitas"];
const CATEGORIAS_DESPESAS_FIXAS = ["custos_fixos", "aluguel", "energia", "agua", "internet", "marketing", "manutencao", "gasolina_delivery", "salarios", "pro_labore", "impostos", "outros"];
const CATEGORIAS_CMV = ["cmv"];

interface Lancamento {
  id: string;
  valor: number;
  tipo: string;
  categoria: string;
  data_lancamento: string;
}

export default function FinanceiroPontoEquilibrio() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const startDate = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lancamentos_financeiros_pe", mes, ano],
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

  const calc = useMemo(() => {
    const sumByCategorias = (categorias: string[], tipo: string) =>
      lancamentos
        .filter((l) => l.tipo === tipo && categorias.includes(l.categoria))
        .reduce((acc, l) => acc + Number(l.valor), 0);

    const receitaBruta = sumByCategorias(CATEGORIAS_RECEITA, "receita");
    const cmv = sumByCategorias(CATEGORIAS_CMV, "despesa");
    const despesasFixas = sumByCategorias(CATEGORIAS_DESPESAS_FIXAS, "despesa");

    const margemContribuicaoPct = receitaBruta > 0
      ? ((receitaBruta - cmv) / receitaBruta) * 100
      : 0;

    const pontoEquilibrio = margemContribuicaoPct > 0
      ? despesasFixas / (margemContribuicaoPct / 100)
      : 0;

    const folga = receitaBruta - pontoEquilibrio;
    const progressPct = pontoEquilibrio > 0
      ? Math.min((receitaBruta / pontoEquilibrio) * 100, 150)
      : 0;

    return {
      receitaBruta,
      cmv,
      despesasFixas,
      margemContribuicaoPct,
      pontoEquilibrio,
      folga,
      progressPct,
      atingiu: receitaBruta >= pontoEquilibrio && pontoEquilibrio > 0,
    };
  }, [lancamentos]);

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Ponto de Equilíbrio</h1>
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

      {/* Explanation */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">O que é o Ponto de Equilíbrio?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Faturamento mínimo para cobrir todas as despesas fixas. Tudo acima disso é lucro!
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Ponto de Equilíbrio = Despesas Fixas Totais ÷ Margem de Contribuição %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <CardContent className="pt-7 pb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Despesas Fixas do Mês</p>
            <p className="text-2xl font-extrabold text-foreground">{fmt(calc.despesasFixas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-7 pb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Margem de Contribuição</p>
            <p className="text-2xl font-extrabold text-foreground">{fmtPct(calc.margemContribuicaoPct)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="pt-7 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ponto de Equilíbrio</p>
            </div>
            <p className="text-2xl font-extrabold text-primary">{fmt(calc.pontoEquilibrio)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progresso do Mês — {MESES[mes - 1]} {ano}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Faturamento Atual</span>
              <span className="font-bold text-foreground">{fmt(calc.receitaBruta)}</span>
            </div>

            {/* Custom progress bar */}
            <div className="relative h-8 bg-muted rounded-full overflow-hidden">
              {/* PE marker */}
              {calc.pontoEquilibrio > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
                  style={{
                    left: `${Math.min((100 / calc.progressPct) * 100, 100)}%`,
                  }}
                />
              )}
              {/* Fill */}
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  calc.atingiu
                    ? "bg-gradient-to-r from-red-400 via-yellow-400 to-green-500"
                    : "bg-gradient-to-r from-red-400 to-red-500"
                }`}
                style={{
                  width: `${Math.min(calc.progressPct, 100)}%`,
                }}
              />
              {/* Label inside */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold text-foreground/80">
                  {calc.pontoEquilibrio > 0
                    ? `${((calc.receitaBruta / calc.pontoEquilibrio) * 100).toFixed(0)}%`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>R$ 0</span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                PE: {fmt(calc.pontoEquilibrio)}
              </span>
            </div>

            {/* Folga / Deficit */}
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                calc.folga >= 0
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {calc.folga >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {calc.folga >= 0
                    ? `Folga de ${fmt(calc.folga)} acima do equilíbrio`
                    : `Faltam ${fmt(Math.abs(calc.folga))} para atingir o equilíbrio`}
                </p>
                <p className="text-xs opacity-80">
                  {calc.folga >= 0
                    ? "O faturamento já cobre todas as despesas fixas!"
                    : "Continue faturando para cobrir os custos fixos do mês."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
