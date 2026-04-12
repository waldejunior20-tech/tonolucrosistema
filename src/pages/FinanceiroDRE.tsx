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
  cmv: "bg-orange-500",
  salarios: "bg-purple-500",
  pro_labore: "bg-violet-500",
  aluguel: "bg-blue-500",
  energia: "bg-yellow-500",
  agua: "bg-cyan-500",
  internet: "bg-indigo-500",
  marketing: "bg-pink-500",
  manutencao: "bg-amber-600",
  gasolina_delivery: "bg-slate-500",
  impostos: "bg-red-500",
  taxas_apps: "bg-rose-400",
  custos_fixos: "bg-blue-400",
  outros: "bg-gray-400",
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
    { label: "Ingredientes", value: calc.per100(calc.cmv), color: "bg-orange-500" },
    { label: "Desp. fixas", value: calc.per100(calc.despFixas), color: "bg-blue-500" },
    { label: "Impostos", value: calc.per100(calc.impostos), color: "bg-red-500" },
    { label: "Salários", value: calc.per100(calc.salarios), color: "bg-purple-500" },
    { label: "Lucro", value: calc.per100(calc.sobrou), color: calc.sobrou >= 0 ? "bg-green-500" : "bg-red-500" },
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
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-syne uppercase">DRE Financeiro</h1>
          <p className="text-text2 font-medium">Demonstrativo de Resultados do Exercício</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <button onClick={() => openDialog("receita")} className="btn-3d-green h-10 px-6 flex items-center gap-2">
            <Plus className="h-4 w-4" /> <span>Receita</span>
          </button>
          <button onClick={() => openDialog("despesa")} className="btn-3d-red h-10 px-6 flex items-center gap-2">
            <Plus className="h-4 w-4" /> <span>Despesa</span>
          </button>
          <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border">
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
      </div>

      <HealthStatus status={calc.status === "verde" ? "healthy" : calc.status === "amarelo" ? "warning" : "danger"} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-premium p-6">
          <p className="label-upper mb-4">Faturamento Total</p>
          <p className="kpi-number text-[#27AE60]">{fmt(calc.totalEntrou)}</p>
        </div>
        <div className="card-premium p-6">
          <p className="label-upper mb-4">Saída Total</p>
          <p className="kpi-number text-[#C0392B]">{fmt(calc.totalSaiu)}</p>
        </div>
        <div className={cn("card-premium p-6", calc.sobrou >= 0 ? "border-[#27AE60]/30 shadow-sm shadow-[#27AE60]/5" : "border-[#C0392B]/30 shadow-sm shadow-[#C0392B]/5")}>
          <p className="label-upper mb-4">{calc.sobrou >= 0 ? "Lucro Líquido" : "Prejuízo"}</p>
          <p className={cn("kpi-number", calc.sobrou >= 0 ? "text-[#27AE60]" : "text-[#C0392B]")}>{fmt(Math.abs(calc.sobrou))}</p>
          <p className={cn("text-[11px] mt-1 font-bold", calc.sobrou >= 0 ? "text-[#27AE60]" : "text-[#C0392B]")}>{calc.sobrouPct.toFixed(1)}% de margem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-premium p-6">
          <div className="pb-4">
            <h3 className="text-base font-bold flex items-center gap-2 font-syne uppercase">Meta do mês</h3>
            <p className="text-[11px] text-text3 font-medium uppercase tracking-wider">Objetivo de Faturamento</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Meta R$</Label>
              <MoneyInput value={metaFaturamento} onChange={(v) => upsertMetaMutation.mutate(v)} />
            </div>
            {metaFaturamento > 0 && (
              <>
                <div className="progress-premium">
                  <div className={cn("progress-premium-bar", metaAtingida ? "bg-green-500" : "bg-red-400")} style={{ width: `${metaProgress}%` }} />
                </div>
                <p className={cn("text-xs text-center font-bold uppercase", metaAtingida ? "text-green-600" : "text-red-500")}>
                  {metaAtingida ? `Meta batida! Você faturou ${metaPctAcima.toFixed(0)}% acima` : `Faltam ${fmt(metaFaturamento - calc.totalEntrou)} para bater a meta`}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="pb-4">
            <h3 className="text-base font-bold flex items-center gap-2 font-syne uppercase"><Target className="h-5 w-5 text-orange-500" /> Ponto de Equilíbrio</h3>
            <p className="text-[11px] text-text3 font-medium uppercase tracking-wider">Zero a Zero</p>
          </div>
          <div className="space-y-4">
            <p className="text-center text-3xl font-bold text-orange-500 font-syne">{fmt(calc.pontoEquilibrio)}</p>
            <div className="progress-premium">
              <div className={cn("progress-premium-bar", calc.atingiuPE ? "bg-gradient-to-r from-red-400 via-yellow-400 to-green-500" : "bg-gradient-to-r from-red-400 to-red-500")} style={{ width: `${Math.min(calc.progressPE, 100)}%` }} />
            </div>
            <div className="text-xs space-y-1 text-text2">
              <div className="flex justify-between"><span>Despesas fixas</span><span className="font-medium text-foreground">{fmt(calc.despFixasTotal)}</span></div>
              <div className="flex justify-between"><span>Margem contrib. %</span><span className="font-medium text-foreground">{calc.margemContribuicaoPct.toFixed(1)}%</span></div>
            </div>
            <p className={cn("text-xs text-center font-bold uppercase", calc.atingiuPE ? "text-green-600" : "text-red-500")}>
              {calc.atingiuPE ? "Tudo acima disso é lucro puro!" : calc.pontoEquilibrio > 0 ? `Faltam ${fmt(calc.faltaPE)} para atingir` : "Cadastre receitas e despesas"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="card-premium p-6">
          <div className="pb-4"><h3 className="text-sm font-bold font-syne uppercase">Sobra das vendas</h3><p className="text-[10px] text-text3 font-medium uppercase tracking-wider">Margem de contribuição</p></div>
          <div className="space-y-4">
            <p className="text-2xl font-bold text-[#27AE60] font-syne">{fmt(calc.margemContribuicao)}</p>
            <div className="text-[11px] space-y-1 border-t pt-2 text-text2">
              <div className="flex justify-between"><span>Faturamento Bruto</span><span className="font-medium text-foreground">{fmt(calc.totalEntrou)}</span></div>
              <div className="flex justify-between text-[#C0392B]"><span>(-) Desp. s/ vendas</span><span>-{fmt(calc.despesasSobreVendas)}</span></div>
              <div className="flex justify-between text-[#C0392B]"><span>(-) CMV</span><span>-{fmt(calc.cmv)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1"><span className="text-foreground">(=) Sobra</span><span className="text-[#27AE60]">{fmt(calc.margemContribuicao)}</span></div>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="pb-4"><h3 className="text-sm font-bold font-syne uppercase">Para cada R$100 vendidos</h3><p className="text-[10px] text-text3 font-medium uppercase tracking-wider">Raio-X de Lucratividade</p></div>
          <div className="space-y-4">
            <p className={cn("text-2xl font-bold font-syne", lucroLiquidoPer100 >= 0 ? "text-[#27AE60]" : "text-[#C0392B]")}>R$ {Math.abs(lucroLiquidoPer100).toFixed(2).replace(".", ",")}</p>
            <div className="space-y-2 border-t pt-2">
              {per100Items.map((item) => {
                const maxVal = Math.max(...per100Items.map(i => Math.abs(i.value)), 1);
                const barW = (Math.abs(item.value) / maxVal) * 100;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]"><div className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full shrink-0", item.color)} /><span className="text-text2">{item.label}</span></div><span className="font-bold text-foreground">R$ {Math.abs(item.value).toFixed(2).replace(".", ",")}</span></div>
                    <div className="h-1.5 bg-bg3 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${barW}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="pb-4"><h3 className="text-sm font-bold font-syne uppercase">CMV</h3><p className="text-[10px] text-text3 font-medium uppercase tracking-wider">Custo dos ingredientes</p></div>
          <div className="space-y-4">
            <p className={cn("text-3xl font-bold text-center font-syne", calc.cmvPct > 40 ? "text-[#C0392B]" : calc.cmvPct > 32 ? "text-[#F39C12]" : "text-[#27AE60]")}>{calc.cmvPct.toFixed(1)}%</p>
            <div className="progress-premium"><div className={cn("progress-premium-bar", calc.cmvPct > 40 ? "bg-[#C0392B]" : calc.cmvPct > 32 ? "bg-[#F39C12]" : "bg-[#27AE60]")} style={{ width: `${Math.min(calc.cmvPct * 2.5, 100)}%` }} /></div>
            <div className="text-[11px] space-y-1 text-text2">
              <div className="flex justify-between"><span>Meta máxima</span><span className="font-bold text-foreground">32%</span></div>
              <div className="flex justify-between"><span>Folga</span><span className={cn("font-bold", cmvFolga >= 0 ? "text-[#27AE60]" : "text-[#C0392B]")}>{cmvFolga >= 0 ? `${cmvFolga.toFixed(1)}%` : `${Math.abs(cmvFolga).toFixed(1)}% acima`}</span></div>
            </div>
          </div>
        </div>

        <div className="card-premium p-6">
          <div className="pb-4"><h3 className="text-sm font-bold font-syne uppercase flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#F39C12]" />Alertas</h3><p className="text-[10px] text-text3 font-medium uppercase tracking-wider">Situações Críticas</p></div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {alertas.length === 0 && contasAtrasadas.length === 0 ? (
              <div className="text-center py-4"><p className="text-xs text-[#27AE60] font-bold uppercase tracking-tight">Tudo em dia!</p></div>
            ) : (
              <div className="space-y-2">
                {alertas.map((a, i) => (<div key={i} className="flex items-start gap-2 text-[11px] bg-[#F39C12]/10 border border-[#F39C12]/20 rounded-md p-2"><AlertTriangle className="h-3.5 w-3.5 text-[#F39C12] shrink-0 mt-0.5" /><span className="text-foreground font-medium">{a}</span></div>))}
                {contasAtrasadas.map((c) => (<div key={c.id} className="flex items-start gap-2 text-[11px] bg-[#C0392B]/10 border border-[#C0392B]/20 rounded-md p-2"><div className="h-2.5 w-2.5 rounded-full bg-[#C0392B] shrink-0 mt-1" /><div><p className="font-bold text-foreground">{c.descricao}</p><p className="text-text2">{fmt(c.valor)} — {new Date(c.data_lancamento + "T12:00:00").toLocaleDateString("pt-BR")}</p></div></div>))}
              </div>
            )}
          </div>
        </div>
      </div>

      {calc.categoriasOrdenadas.length > 0 && (
        <div className="card-premium p-6">
          <div className="pb-4"><h3 className="text-base font-bold font-syne uppercase">Onde foi o dinheiro?</h3></div>
          <div className="space-y-3">
            {calc.categoriasOrdenadas.map((c) => {
              const barColor = CAT_COLORS[c.cat] || "bg-primary/70";
              return (
                <div key={c.cat} className="space-y-1">
                  <div className="flex items-center justify-between text-sm"><span className="text-foreground/80">{c.label}</span><div className="flex items-center gap-3"><span className="font-semibold">{fmt(c.valor)}</span><span className="text-muted-foreground text-xs w-10 text-right">{c.pct.toFixed(0)}%</span></div></div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${c.pctDespesas}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <button className="btn-3d-ghost h-10 px-6" onClick={() => setDialogOpen(false)}>Cancelar</button>
            <button className="btn-3d-red h-10 px-6" onClick={handleSubmit} disabled={createMutation.isPending}>Salvar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
