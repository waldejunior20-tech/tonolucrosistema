import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/MoneyInput";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CATEGORIAS_RECEITA_OPTIONS = [
  { value: "vendas_balcao", label: "Vendas Balcão" },
  { value: "vendas_delivery", label: "Vendas Delivery" },
  { value: "vendas_ifood", label: "Vendas iFood" },
  { value: "outras_receitas", label: "Outras Receitas" },
];

const CATEGORIAS_DESPESA_OPTIONS = [
  { value: "cmv", label: "Ingredientes / Fornecedores" },
  { value: "custos_fixos", label: "Custos Fixos" },
  { value: "salarios", label: "Salários" },
  { value: "pro_labore", label: "Pró-labore" },
  { value: "impostos", label: "Impostos" },
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet" },
  { value: "marketing", label: "Marketing" },
  { value: "manutencao", label: "Manutenção" },
  { value: "gasolina_delivery", label: "Gasolina Delivery" },
  { value: "outros", label: "Outros" },
];

const CAT_LABELS: Record<string, string> = {
  cmv: "Fornecedores / Ingredientes",
  custos_fixos: "Custos Fixos",
  salarios: "Salários",
  pro_labore: "Pró-labore",
  impostos: "Impostos",
  aluguel: "Aluguel",
  energia: "Energia",
  agua: "Água",
  internet: "Internet",
  marketing: "Marketing",
  manutencao: "Manutenção",
  gasolina_delivery: "Gasolina / Delivery",
  outros: "Outros",
  vendas_balcao: "Vendas Balcão",
  vendas_delivery: "Vendas Delivery",
  vendas_ifood: "Vendas iFood",
  outras_receitas: "Outras Receitas",
};

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data_lancamento: string;
  pago: boolean;
}

interface FormData {
  descricao: string;
  valor: number;
  categoria: string;
  data_lancamento: string;
  data_fim: string;
}

const emptyForm = (tipo: "receita" | "despesa"): FormData => ({
  descricao: "",
  valor: 0,
  categoria: tipo === "receita" ? "vendas_balcao" : "cmv",
  data_lancamento: new Date().toISOString().slice(0, 10),
  data_fim: "",
});

export default function FinanceiroDRE() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState<"receita" | "despesa">("receita");
  const [form, setForm] = useState<FormData>(emptyForm("receita"));

  const startDate = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const endDate = mes === 12
    ? `${ano + 1}-01-01`
    : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lancamentos_dre", mes, ano],
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

  const { data: meta } = useQuery({
    queryKey: ["metas_financeiras", mes, ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_financeiras")
        .select("*")
        .eq("mes", mes)
        .eq("ano", ano)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const upsertMetaMutation = useMutation({
    mutationFn: async (metaFaturamento: number) => {
      if (meta?.id) {
        const { error } = await supabase
          .from("metas_financeiras")
          .update({ meta_faturamento: metaFaturamento })
          .eq("id", meta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("metas_financeiras")
          .insert({ mes, ano, meta_faturamento: metaFaturamento });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas_financeiras", mes, ano] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { descricao: string; valor: number; tipo: string; categoria: string; data_lancamento: string }) => {
      const { error } = await supabase.from("lancamentos_financeiros").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos_dre"] });
      queryClient.invalidateQueries({ queryKey: ["lancamentos_financeiros"] });
      toast.success("Lançamento salvo!");
      setDialogOpen(false);
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const handleSubmit = () => {
    if (!form.descricao || !form.valor) return;

    if (form.data_fim) {
      // Create one entry per day in the range
      const start = new Date(form.data_lancamento + "T12:00:00");
      const end = new Date(form.data_fim + "T12:00:00");
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      const dailyValue = form.valor / days;

      const entries = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        entries.push({
          descricao: form.descricao,
          valor: Math.round(dailyValue * 100) / 100,
          tipo: dialogTipo,
          categoria: form.categoria,
          data_lancamento: d.toISOString().slice(0, 10),
        });
      }
      supabase.from("lancamentos_financeiros").insert(entries).then(({ error }) => {
        if (error) { toast.error("Erro ao salvar"); return; }
        queryClient.invalidateQueries({ queryKey: ["lancamentos_dre"] });
        queryClient.invalidateQueries({ queryKey: ["lancamentos_financeiros"] });
        toast.success("Lançamentos salvos!");
        setDialogOpen(false);
      });
    } else {
      createMutation.mutate({
        descricao: form.descricao,
        valor: form.valor,
        tipo: dialogTipo,
        categoria: form.categoria,
        data_lancamento: form.data_lancamento,
      });
    }
  };

  const openDialog = (tipo: "receita" | "despesa") => {
    setDialogTipo(tipo);
    setForm(emptyForm(tipo));
    setDialogOpen(true);
  };

  // Média diária calculation
  const mediaDiaria = useMemo(() => {
    if (!form.data_fim || !form.data_lancamento || !form.valor) return null;
    const start = new Date(form.data_lancamento + "T12:00:00");
    const end = new Date(form.data_fim + "T12:00:00");
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return form.valor / days;
  }, [form.data_lancamento, form.data_fim, form.valor]);

  const calc = useMemo(() => {
    const receitas = lancamentos.filter((l) => l.tipo === "receita");
    const despesas = lancamentos.filter((l) => l.tipo === "despesa");

    const totalEntrou = receitas.reduce((s, l) => s + Number(l.valor), 0);
    const totalSaiu = despesas.reduce((s, l) => s + Number(l.valor), 0);
    const sobrou = totalEntrou - totalSaiu;
    const sobrouPct = totalEntrou > 0 ? (sobrou / totalEntrou) * 100 : 0;

    const cmv = despesas.filter((l) => l.categoria === "cmv").reduce((s, l) => s + Number(l.valor), 0);
    const despFixas = despesas.filter((l) => ["custos_fixos", "aluguel", "energia", "agua", "internet", "marketing", "manutencao", "gasolina_delivery", "outros"].includes(l.categoria)).reduce((s, l) => s + Number(l.valor), 0);
    const impostos = despesas.filter((l) => l.categoria === "impostos").reduce((s, l) => s + Number(l.valor), 0);
    const salarios = despesas.filter((l) => ["salarios", "pro_labore"].includes(l.categoria)).reduce((s, l) => s + Number(l.valor), 0);

    const per100 = (v: number) => totalEntrou > 0 ? (v / totalEntrou) * 100 : 0;

    // Margem de contribuição
    const despesasSobreVendas = impostos;
    const cmvEVariaveis = cmv;
    const margemContribuicao = totalEntrou - despesasSobreVendas - cmvEVariaveis;
    const margemContribuicaoPct = totalEntrou > 0 ? (margemContribuicao / totalEntrou) * 100 : 0;

    // Ponto de equilíbrio
    const despFixasTotal = despFixas + salarios;
    const pontoEquilibrio = margemContribuicaoPct > 0 ? despFixasTotal / (margemContribuicaoPct / 100) : 0;
    const faltaPE = pontoEquilibrio - totalEntrou;
    const progressPE = pontoEquilibrio > 0 ? Math.min((totalEntrou / pontoEquilibrio) * 100, 100) : 0;

    // Onde foi o dinheiro
    const porCategoria = despesas.reduce<Record<string, number>>((acc, l) => {
      acc[l.categoria] = (acc[l.categoria] || 0) + Number(l.valor);
      return acc;
    }, {});
    const categoriasOrdenadas = Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, valor]) => ({
        cat,
        label: CAT_LABELS[cat] || cat,
        valor,
        pct: totalSaiu > 0 ? (valor / totalSaiu) * 100 : 0,
      }));

    return {
      totalEntrou, totalSaiu, sobrou, sobrouPct,
      cmv, despFixas, impostos, salarios,
      per100,
      despesasSobreVendas, cmvEVariaveis, margemContribuicao, margemContribuicaoPct,
      despFixasTotal,
      pontoEquilibrio, faltaPE, progressPE,
      atingiuPE: totalEntrou >= pontoEquilibrio && pontoEquilibrio > 0,
      categoriasOrdenadas,
    };
  }, [lancamentos]);

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const per100Items = [
    { emoji: "📋", label: "Impostos", value: calc.per100(calc.impostos), color: "bg-destructive" },
    { emoji: "🍕", label: "CMV", value: calc.per100(calc.cmv), color: "bg-orange-500" },
    { emoji: "🏠", label: "Desp. fixas", value: calc.per100(calc.despFixas), color: "bg-blue-500" },
    { emoji: "👥", label: "Salários", value: calc.per100(calc.salarios), color: "bg-purple-500" },
    { emoji: "💚", label: "Seu lucro", value: calc.per100(calc.sobrou), color: calc.sobrou >= 0 ? "bg-green-500" : "bg-destructive" },
  ];

  const lucroLiquidoPer100 = calc.per100(calc.sobrou);

  // Meta
  const metaFaturamento = meta?.meta_faturamento ?? 0;
  const metaProgress = metaFaturamento > 0 ? Math.min((calc.totalEntrou / metaFaturamento) * 100, 100) : 0;
  const metaAtingida = metaFaturamento > 0 && calc.totalEntrou >= metaFaturamento;
  const metaPctAcima = metaFaturamento > 0 ? ((calc.totalEntrou - metaFaturamento) / metaFaturamento) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Resultado do Mês</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <Button onClick={() => openDialog("receita")} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Receita
          </Button>
          <Button onClick={() => openDialog("despesa")} variant="destructive">
            <Plus className="h-4 w-4 mr-1" /> Despesa
          </Button>
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* BLOCO 1: RESUMO DO MÊS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">💰 Entrou</p>
            <p className="text-3xl font-bold text-green-600">{fmt(calc.totalEntrou)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">💸 Saiu</p>
            <p className="text-3xl font-bold text-destructive">{fmt(calc.totalSaiu)}</p>
          </CardContent>
        </Card>
        <Card className={calc.sobrou >= 0 ? "border-green-300 bg-green-50/40 dark:bg-green-950/20" : "border-red-300 bg-red-50/40 dark:bg-red-950/20"}>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {calc.sobrou >= 0 ? "✅ Sobrou" : "❌ Faltou"}
            </p>
            <p className={`text-3xl font-bold ${calc.sobrou >= 0 ? "text-green-600" : "text-destructive"}`}>
              {fmt(Math.abs(calc.sobrou))}
            </p>
            <p className={`text-sm mt-1 ${calc.sobrou >= 0 ? "text-green-600" : "text-destructive"}`}>
              {calc.sobrouPct.toFixed(1)}% da receita
            </p>
          </CardContent>
        </Card>
      </div>

      {/* BLOCO 2: PONTO DE EQUILÍBRIO */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Ponto de Equilíbrio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-3xl font-bold text-foreground mb-4">
            {fmt(calc.pontoEquilibrio)}
          </p>
          <div className="relative h-6 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                calc.atingiuPE
                  ? "bg-gradient-to-r from-red-400 via-yellow-400 to-green-500"
                  : "bg-gradient-to-r from-red-400 to-red-500"
              }`}
              style={{ width: `${calc.progressPE}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground/80">
                {calc.pontoEquilibrio > 0
                  ? `${((calc.totalEntrou / calc.pontoEquilibrio) * 100).toFixed(0)}%`
                  : "—"}
              </span>
            </div>
          </div>
          <p className={`text-center text-sm font-medium ${calc.atingiuPE ? "text-green-600" : "text-destructive"}`}>
            {calc.atingiuPE
              ? `✅ Atingido! Folga de ${fmt(Math.abs(calc.faltaPE))}`
              : calc.pontoEquilibrio > 0
              ? `Faltam ${fmt(calc.faltaPE)} para atingir`
              : "Cadastre receitas e despesas para calcular"}
          </p>
        </CardContent>
      </Card>

      {/* 4 CARDS DETALHADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CARD 1: Sobra das Vendas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sobra das vendas</CardTitle>
            <p className="text-xs text-muted-foreground">Margem de contribuição</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-green-600">{fmt(calc.margemContribuicao)}</p>
            <p className="text-xs text-muted-foreground">Sobraram para pagar despesas fixas</p>
            <div className="text-xs space-y-1 border-t pt-2">
              <div className="flex justify-between">
                <span>Faturamento Bruto</span>
                <span className="font-medium">{fmt(calc.totalEntrou)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>(-) Desp. s/ vendas</span>
                <span>-{fmt(calc.despesasSobreVendas)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>(-) CMV e desp. variáveis</span>
                <span>-{fmt(calc.cmvEVariaveis)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>(=) Margem contribuição</span>
                <span className="text-green-600">{fmt(calc.margemContribuicao)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: Ponto de Equilíbrio detalhado */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ponto de Equilíbrio</CardTitle>
            <p className="text-xs text-muted-foreground">Onde as vendas viram lucro</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-bold text-orange-500">{fmt(calc.pontoEquilibrio)}</p>
            <p className="text-xs text-muted-foreground">Faturamento mínimo necessário</p>
            <div className="text-xs space-y-1 border-t pt-2">
              <div className="flex justify-between">
                <span>Despesas Fixas</span>
                <span className="font-medium">{fmt(calc.despFixasTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Margem Contrib. %</span>
                <span className="font-medium">{calc.margemContribuicaoPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Ponto de Equilíbrio</span>
                <span className="text-orange-500">{fmt(calc.pontoEquilibrio)}</span>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Tudo acima disso é lucro puro! 🎯
            </p>
          </CardContent>
        </Card>

        {/* CARD 3: Para cada R$100 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Para cada R$100,00 vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={`text-2xl font-bold ${lucroLiquidoPer100 >= 0 ? "text-green-600" : "text-destructive"}`}>
              R$ {Math.abs(lucroLiquidoPer100).toFixed(2).replace(".", ",")}
            </p>
            <p className="text-xs text-muted-foreground">
              {lucroLiquidoPer100 >= 0 ? "sobram de lucro líquido" : "de prejuízo líquido"}
            </p>
            <div className="space-y-2 border-t pt-2">
              {per100Items.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.color} shrink-0`} />
                  <span className="flex-1">{item.label}</span>
                  <span className="font-medium">R$ {Math.abs(item.value).toFixed(2).replace(".", ",")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CARD 4: Meta do Mês */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Meta do mês</CardTitle>
            <p className="text-xs text-muted-foreground">Quanto você quer faturar</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Meta R$</Label>
              <MoneyInput
                value={metaFaturamento}
                onChange={(v) => upsertMetaMutation.mutate(v)}
              />
            </div>
            {metaFaturamento > 0 && (
              <>
                <div className="relative h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      metaAtingida ? "bg-green-500" : "bg-red-400"
                    }`}
                    style={{ width: `${metaProgress}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-foreground/80">
                      {((calc.totalEntrou / metaFaturamento) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className={`text-xs text-center font-medium ${metaAtingida ? "text-green-600" : "text-destructive"}`}>
                  {metaAtingida
                    ? `🎉 Meta batida! Você faturou ${metaPctAcima.toFixed(0)}% acima`
                    : `Faltam ${fmt(metaFaturamento - calc.totalEntrou)} para bater a meta`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BLOCO 3: PARA CADA R$100 — barras horizontais */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Para cada R$100 vendidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {per100Items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.emoji} {item.label}</span>
                <span className="font-semibold">R$ {Math.abs(item.value).toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                  style={{ width: `${Math.min(Math.abs(item.value), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* BLOCO 4: ONDE FOI O DINHEIRO? */}
      {calc.categoriasOrdenadas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Onde foi o dinheiro?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {calc.categoriasOrdenadas.map((c) => (
              <div key={c.cat} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80">{c.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{fmt(c.valor)}</span>
                    <span className="text-muted-foreground text-xs w-10 text-right">{c.pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all duration-500"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dialog — Nova Receita / Despesa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogTipo === "receita" ? "💰 Nova Receita" : "💸 Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Vendas do dia, Conta de luz..."
              />
            </div>
            <div>
              <Label>Valor</Label>
              <MoneyInput
                value={form.valor}
                onChange={(v) => setForm((f) => ({ ...f, valor: v }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data início</Label>
                <Input
                  type="date"
                  value={form.data_lancamento}
                  onChange={(e) => setForm((f) => ({ ...f, data_lancamento: e.target.value }))}
                />
              </div>
              <div>
                <Label>Data fim <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                />
              </div>
            </div>
            {mediaDiaria !== null && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                Média diária: <span className="font-semibold text-foreground">{fmt(mediaDiaria)}</span>
              </p>
            )}
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(dialogTipo === "receita" ? CATEGORIAS_RECEITA_OPTIONS : CATEGORIAS_DESPESA_OPTIONS).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
