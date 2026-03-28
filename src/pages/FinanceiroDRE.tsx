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
import { Plus, TrendingUp, TrendingDown, Target } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const CATEGORIAS_RECEITA = ["vendas_balcao", "vendas_delivery", "vendas_ifood", "outras_receitas"];

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

const REPETICAO_OPTIONS = [
  { value: "nao", label: "Não repete" },
  { value: "mensal", label: "Todo mês" },
  { value: "diario", label: "Todo dia" },
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
  repeticao: string;
}

const emptyForm = (tipo: "receita" | "despesa"): FormData => ({
  descricao: "",
  valor: 0,
  categoria: tipo === "receita" ? "vendas_balcao" : "cmv",
  data_lancamento: new Date().toISOString().slice(0, 10),
  repeticao: "nao",
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
    createMutation.mutate({
      descricao: form.descricao,
      valor: form.valor,
      tipo: dialogTipo,
      categoria: form.categoria,
      data_lancamento: form.data_lancamento,
    });
  };

  const openDialog = (tipo: "receita" | "despesa") => {
    setDialogTipo(tipo);
    setForm(emptyForm(tipo));
    setDialogOpen(true);
  };

  const calc = useMemo(() => {
    const receitas = lancamentos.filter((l) => l.tipo === "receita");
    const despesas = lancamentos.filter((l) => l.tipo === "despesa");

    const totalEntrou = receitas.reduce((s, l) => s + Number(l.valor), 0);
    const totalSaiu = despesas.reduce((s, l) => s + Number(l.valor), 0);
    const sobrou = totalEntrou - totalSaiu;
    const sobrouPct = totalEntrou > 0 ? (sobrou / totalEntrou) * 100 : 0;

    // Per R$100
    const cmv = despesas.filter((l) => l.categoria === "cmv").reduce((s, l) => s + Number(l.valor), 0);
    const despFixas = despesas.filter((l) => ["custos_fixos", "aluguel", "energia", "agua", "internet", "marketing", "manutencao", "gasolina_delivery", "outros"].includes(l.categoria)).reduce((s, l) => s + Number(l.valor), 0);
    const impostos = despesas.filter((l) => l.categoria === "impostos").reduce((s, l) => s + Number(l.valor), 0);
    const salarios = despesas.filter((l) => ["salarios", "pro_labore"].includes(l.categoria)).reduce((s, l) => s + Number(l.valor), 0);

    const per100 = (v: number) => totalEntrou > 0 ? (v / totalEntrou) * 100 : 0;

    // Ponto de equilíbrio
    const margemPct = totalEntrou > 0 ? ((totalEntrou - cmv) / totalEntrou) * 100 : 0;
    const despFixasTotal = despFixas + salarios + impostos;
    const pontoEquilibrio = margemPct > 0 ? despFixasTotal / (margemPct / 100) : 0;
    const faltaPE = pontoEquilibrio - totalEntrou;
    const progressPE = pontoEquilibrio > 0 ? Math.min((totalEntrou / pontoEquilibrio) * 100, 100) : 0;

    // Onde foi o dinheiro - group despesas by categoria
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
      totalEntrou,
      totalSaiu,
      sobrou,
      sobrouPct,
      cmv,
      despFixas,
      impostos,
      salarios,
      per100,
      pontoEquilibrio,
      faltaPE,
      progressPE,
      atingiuPE: totalEntrou >= pontoEquilibrio && pontoEquilibrio > 0,
      categoriasOrdenadas,
    };
  }, [lancamentos]);

  const anos = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const per100Items = [
    { emoji: "🍕", label: "Ingredientes", value: calc.per100(calc.cmv), color: "bg-orange-500" },
    { emoji: "🏠", label: "Despesas fixas", value: calc.per100(calc.despFixas), color: "bg-blue-500" },
    { emoji: "📋", label: "Impostos", value: calc.per100(calc.impostos), color: "bg-red-500" },
    { emoji: "👥", label: "Salários", value: calc.per100(calc.salarios), color: "bg-purple-500" },
    { emoji: "💚", label: "Seu lucro", value: calc.per100(calc.sobrou), color: calc.sobrou >= 0 ? "bg-green-500" : "bg-red-600" },
  ];

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

      {/* 1. RESUMO DO MÊS */}
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
            <p className="text-3xl font-bold text-red-500">{fmt(calc.totalSaiu)}</p>
          </CardContent>
        </Card>
        <Card className={calc.sobrou >= 0 ? "border-green-300 bg-green-50/40" : "border-red-300 bg-red-50/40"}>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {calc.sobrou >= 0 ? "✅ Sobrou" : "❌ Faltou"}
            </p>
            <p className={`text-3xl font-bold ${calc.sobrou >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(Math.abs(calc.sobrou))}
            </p>
            <p className={`text-sm mt-1 ${calc.sobrou >= 0 ? "text-green-600" : "text-red-600"}`}>
              {calc.sobrouPct.toFixed(1)}% da receita
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. PONTO DE EQUILÍBRIO */}
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

          {/* Progress bar */}
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

          <p className={`text-center text-sm font-medium ${calc.atingiuPE ? "text-green-600" : "text-red-600"}`}>
            {calc.atingiuPE
              ? `✅ Atingido! Folga de ${fmt(Math.abs(calc.faltaPE))}`
              : calc.pontoEquilibrio > 0
              ? `Faltam ${fmt(calc.faltaPE)} para atingir`
              : "Cadastre receitas e despesas para calcular"}
          </p>
        </CardContent>
      </Card>

      {/* 3. PARA CADA R$100 VENDIDOS */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Para cada R$100 vendidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {per100Items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{item.emoji} {item.label}</span>
                <span className="font-semibold">R$ {item.value.toFixed(2)}</span>
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

      {/* 4. ONDE FOI O DINHEIRO? */}
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

      {/* Dialog for new lancamento */}
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
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={form.data_lancamento}
                onChange={(e) => setForm((f) => ({ ...f, data_lancamento: e.target.value }))}
              />
            </div>
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
            <div>
              <Label>Repetir</Label>
              <Select
                value={form.repeticao}
                onValueChange={(v) => setForm((f) => ({ ...f, repeticao: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPETICAO_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
