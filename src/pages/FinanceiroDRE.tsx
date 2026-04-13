import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/MoneyInput";
import { toast } from "sonner";
import { Plus, Target, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { HealthStatus } from "@/components/HealthStatus";

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
  { value: "cmv", label: "Fornecedores / Insumos" },
  { value: "salarios", label: "Salários" },
  { value: "pro_labore", label: "Pró-labore" },
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "agua", label: "Água" },
  { value: "internet", label: "Internet" },
  { value: "marketing", label: "Marketing" },
  { value: "manutencao", label: "Manutenção" },
  { value: "gasolina_delivery", label: "Gasolina Delivery" },
  { value: "impostos", label: "Impostos" },
  { value: "taxas_apps", label: "Taxas apps" },
  { value: "outros", label: "Outros" },
];

const CAT_LABELS: Record<string, string> = {
  cmv: "Fornecedores / Insumos",
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
  taxas_apps: "Taxas apps",
  outros: "Outros",
  vendas_balcao: "Vendas Balcão",
  vendas_delivery: "Vendas Delivery",
  vendas_ifood: "Vendas iFood",
  outras_receitas: "Outras Receitas",
};

const CAT_COLORS: Record<string, string> = {
  cmv: "bg-orange",
  salarios: "bg-info",
  pro_labore: "bg-info",
  aluguel: "bg-primary",
  energia: "bg-warning",
  agua: "bg-primary",
  internet: "bg-info",
  marketing: "bg-destructive",
  manutencao: "bg-warning",
  gasolina_delivery: "bg-muted-foreground",
  impostos: "bg-destructive",
  taxas_apps: "bg-destructive",
  custos_fixos: "bg-info",
  outros: "bg-muted-foreground",
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

  const { data: contasAtrasadas = [] } = useQuery({
    queryKey: ["contas_atrasadas_dre"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .eq("pago", false)
        .eq("tipo", "despesa")
        .lt("data_lancamento", today)
        .limit(10);
      if (error) throw error;
      return data as Lancamento[];
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
    const cmvPct = totalEntrou > 0 ? (cmv / totalEntrou) * 100 : 0;
    const despFixas = despesas.filter((l) =>
      ["custos_fixos", "aluguel", "energia", "agua", "internet", "marketing", "manutencao", "gasolina_delivery", "outros"].includes(l.categoria)
    ).reduce((s, l) => s + Number(l.valor), 0);
    const impostos = despesas.filter((l) => ["impostos", "taxas_apps"].includes(l.categoria)).reduce((s, l) => s + Number(l.valor), 0);
    const salarios = despesas.filter((l) => ["salarios", "pro_labore"].includes(l.categoria)).reduce((s, l) => s + Number(l.valor), 0);
    const per100 = (v: number) => totalEntrou > 0 ? (v / totalEntrou) * 100 : 0;
    const despesasSobreVendas = impostos;
    const margemContribuicao = totalEntrou - despesasSobreVendas - cmv;
    const margemContribuicaoPct = totalEntrou > 0 ? (margemContribuicao / totalEntrou) * 100 : 0;
    const despFixasTotal = despFixas + salarios;
    const pontoEquilibrio = margemContribuicaoPct > 0 ? despFixasTotal / (margemContribuicaoPct / 100) : 0;
    const faltaPE = pontoEquilibrio - totalEntrou;
    const progressPE = pontoEquilibrio > 0 ? Math.min((totalEntrou / pontoEquilibrio) * 100, 150) : 0;
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
        pct: totalEntrou > 0 ? (valor / totalEntrou) * 100 : 0,
        pctDespesas: totalSaiu > 0 ? (valor / totalSaiu) * 100 : 0,
      }));
    let status: "verde" | "amarelo" | "vermelho" = "verde";
    if (sobrou < 0) status = "vermelho";
    else if (cmvPct > 32) status = "amarelo";
    return {
      totalEntrou, totalSaiu, sobrou, sobrouPct,
      cmv, cmvPct, despFixas, impostos, salarios,
      per100,
      despesasSobreVendas, margemContribuicao, margemContribuicaoPct,
      despFixasTotal,
      pontoEquilibrio, faltaPE, progressPE,
      atingiuPE: totalEntrou >= pontoEquilibrio && pontoEquilibrio > 0,
      categoriasOrdenadas,
      status,
    };
  }, [lancamentos]);

  const per100Items = [
    { label: "Ingredientes", value: calc.per100(calc.cmv), color: "bg-orange" },
    { label: "Desp. fixas", value: calc.per100(calc.despFixas), color: "bg-info" },
    { label: "Impostos", value: calc.per100(calc.impostos), color: "bg-destructive" },
    { label: "Salários", value: calc.per100(calc.salarios), color: "bg-primary" },
    { label: "Lucro", value: calc.per100(calc.sobrou), color: calc.sobrou >= 0 ? "bg-success" : "bg-destructive" },
  ];

  const lucroLiquidoPer100 = calc.per100(calc.sobrou);
  const metaFaturamento = meta?.meta_faturamento ?? 0;
  const metaProgress = metaFaturamento > 0 ? Math.min((calc.totalEntrou / metaFaturamento) * 100, 100) : 0;
  const metaAtingida = metaFaturamento > 0 && calc.totalEntrou >= metaFaturamento;
  const metaPctAcima = metaFaturamento > 0 ? ((calc.totalEntrou - metaFaturamento) / metaFaturamento) * 100 : 0;
  const cmvFolga = 32 - calc.cmvPct;

  const alertas: string[] = [];
  if (contasAtrasadas.length > 0) alertas.push(`${contasAtrasadas.length} conta(s) em atraso`);
  if (calc.cmvPct > 40) alertas.push("CMV acima de 40% — atenção urgente!");
  else if (calc.cmvPct > 32) alertas.push("CMV acima da meta de 32%");

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resumo do Mês</h1>
          <p className="text-sm text-muted-foreground">Veja quanto entrou, quanto saiu e quanto sobrou.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border">
          <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
            <SelectTrigger className="w-[120px] h-8 border-none bg-transparent shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (<SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="w-px h-4 bg-border" />
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-[80px] h-8 border-none bg-transparent shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-premium">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Entrou</p>
          <p className="text-2xl font-bold text-foreground">{fmt(calc.totalEntrou)}</p>
        </div>
        <div className="card-premium">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Saiu</p>
          <p className="text-2xl font-bold text-foreground">{fmt(calc.totalSaiu)}</p>
        </div>
        <div className={cn("card-premium", calc.sobrou >= 0 ? "border-success/30" : "border-destructive/30")}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {calc.sobrou >= 0 ? "Sobrou" : "Faltou"}
          </p>
          <p className={cn("text-2xl font-bold", calc.sobrou >= 0 ? "text-success" : "text-destructive")}>
            {fmt(Math.abs(calc.sobrou))}
          </p>
          <p className={cn("text-xs font-semibold mt-1", calc.sobrou >= 0 ? "text-success" : "text-destructive")}>
            {calc.sobrouPct.toFixed(1)}% de margem
          </p>
        </div>
      </div>

      {/* Custo dos Ingredientes + Meta do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Custo dos Ingredientes */}
        <div className="card-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Custo dos Ingredientes</h3>
              <p className="text-xs text-muted-foreground">% do faturamento gasto com insumos</p>
            </div>
            <p className={cn("text-2xl font-bold", calc.cmvPct > 40 ? "text-destructive" : calc.cmvPct > 32 ? "text-warning" : "text-success")}>
              {calc.cmvPct.toFixed(1)}%
            </p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", calc.cmvPct > 40 ? "bg-destructive" : calc.cmvPct > 32 ? "bg-warning" : "bg-success")}
              style={{ width: `${Math.min(calc.cmvPct * 2.5, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Meta: 32%</span>
            <span className={cn("font-semibold", cmvFolga >= 0 ? "text-success" : "text-destructive")}>
              {cmvFolga >= 0 ? `Folga: ${cmvFolga.toFixed(1)}%` : `${Math.abs(cmvFolga).toFixed(1)}% acima`}
            </span>
          </div>
        </div>

        {/* Meta do Mês */}
        <div className="card-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Meta do Mês</h3>
              <p className="text-xs text-muted-foreground">Quanto você quer faturar</p>
            </div>
          </div>
          <MoneyInput value={metaFaturamento} onChange={(v) => upsertMetaMutation.mutate(v)} />
          {metaFaturamento > 0 && (
            <div className="mt-3 space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", metaAtingida ? "bg-success" : "bg-primary")} style={{ width: `${metaProgress}%` }} />
              </div>
              <p className={cn("text-xs text-center font-semibold", metaAtingida ? "text-success" : "text-muted-foreground")}>
                {metaAtingida ? `Meta batida! +${metaPctAcima.toFixed(0)}% acima` : `Faltam ${fmt(metaFaturamento - calc.totalEntrou)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alertas (only if there are any) */}
      {(alertas.length > 0 || contasAtrasadas.length > 0) && (
        <div className="rounded-2xl border border-warning/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
          </div>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm bg-warning/5 border border-warning/15 rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <span className="text-foreground">{a}</span>
              </div>
            ))}
            {contasAtrasadas.map((c) => (
              <div key={c.id} className="flex items-start gap-2 text-sm bg-destructive/5 border border-destructive/15 rounded-lg p-3">
                <div className="h-2 w-2 rounded-full bg-destructive shrink-0 mt-1.5" />
                <div>
                  <p className="font-medium text-foreground">{c.descricao}</p>
                  <p className="text-xs text-muted-foreground">{fmt(c.valor)} — {new Date(c.data_lancamento + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ponto de Equilíbrio */}
      <div className="card-premium">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Ponto de Equilíbrio</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Despesas Fixas</p>
            <p className="text-lg font-bold text-foreground">{fmt(calc.despFixasTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Margem Contribuição</p>
            <p className="text-lg font-bold text-foreground">{calc.margemContribuicaoPct.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Meta Mínima</p>
            <p className="text-lg font-bold text-primary">{fmt(calc.pontoEquilibrio)}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="relative h-7 bg-muted rounded-full overflow-hidden">
          {calc.pontoEquilibrio > 0 && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10" style={{ left: `${Math.min((100 / Math.max(calc.progressPE, 1)) * 100, 100)}%` }} />
          )}
          <div className={cn("h-full rounded-full transition-all duration-500", calc.atingiuPE ? "bg-gradient-to-r from-destructive via-warning to-success" : "bg-destructive")} style={{ width: `${Math.min(calc.progressPE, 100)}%` }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-foreground/80">{calc.pontoEquilibrio > 0 ? `${((calc.totalEntrou / calc.pontoEquilibrio) * 100).toFixed(0)}%` : "—"}</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 mt-3 p-3 rounded-lg text-sm", calc.faltaPE <= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
          {calc.faltaPE <= 0 ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span className="font-semibold">
            {calc.faltaPE <= 0 ? `Folga de ${fmt(Math.abs(calc.faltaPE))} acima do equilíbrio` : `Faltam ${fmt(calc.faltaPE)} para atingir o equilíbrio`}
          </span>
        </div>
      </div>

      {/* DRE - Para cada R$100 */}
      <div className="card-premium">
        <h3 className="text-sm font-semibold text-foreground mb-1">DRE Simplificado</h3>
        <p className="text-xs text-muted-foreground mb-4">Para cada R$ 100 vendidos, quanto vai para cada área</p>
        <div className="space-y-3">
          {per100Items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-bold text-foreground">R$ {item.value.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${Math.min(Math.abs(item.value), 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Para onde foi o dinheiro */}
      {calc.categoriasOrdenadas.length > 0 && (
        <div className="card-premium">
          <h3 className="text-sm font-semibold text-foreground mb-4">Para onde foi o dinheiro?</h3>
          <div className="space-y-3">
            {calc.categoriasOrdenadas.map((c) => {
              const barColor = CAT_COLORS[c.cat] || "bg-primary/70";
              return (
                <div key={c.cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{c.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{fmt(c.valor)}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{c.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${c.pctDespesas}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog (kept for future use if needed) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogTipo === "receita" ? "Nova Receita" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} placeholder={dialogTipo === "receita" ? "Ex: Vendas do dia, Evento..." : "Ex: Conta de luz, Fornecedor..."} /></div>
            <div><Label>Valor</Label><MoneyInput value={form.valor} onChange={(v) => setForm((f) => ({ ...f, valor: v }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data início</Label><Input type="date" value={form.data_lancamento} onChange={(e) => setForm((f) => ({ ...f, data_lancamento: e.target.value }))} /></div>
              <div><Label>Data fim <span className="text-muted-foreground text-xs">(opcional)</span></Label><Input type="date" value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            {mediaDiaria !== null && (<p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">Média diária: <span className="font-semibold text-foreground">{fmt(mediaDiaria)}</span></p>)}
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(dialogTipo === "receita" ? CATEGORIAS_RECEITA_OPTIONS : CATEGORIAS_DESPESA_OPTIONS).map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button className="h-10 px-6 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors" onClick={() => setDialogOpen(false)}>Cancelar</button>
            <button className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-bold hover:brightness-110 transition-all" onClick={handleSubmit} disabled={createMutation.isPending}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
