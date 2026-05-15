import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId, getActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Plus, Pencil, Trash2, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceiroCategoryTabs } from "@/components/financeiro/FinanceiroCategoryTabs";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Categorias detalhadas, separando CMV (insumos que vão no prato)
// de Custos Operacionais (o que faz o restaurante funcionar).
// Sem "Outros" — toda despesa frequente merece categoria própria.
const CATEGORIAS_GRUPOS: { grupo: string; itens: string[] }[] = [
  {
    grupo: "Insumos / CMV (vai no prato)",
    itens: [
      "Proteínas / Açougue",
      "Laticínios",
      "Hortifrúti",
      "Secos / Mercearia",
      "Bebidas",
      "Molhos e Condimentos",
      "Embalagens / Descartáveis",
      "Congelados",
      "Confeitaria",
    ],
  },
  {
    grupo: "Operacional (faz o restaurante funcionar)",
    itens: [
      "Aluguel",
      "Energia Elétrica",
      "Água",
      "Gás",
      "Internet / Telefone",
    ],
  },
  {
    grupo: "Pessoal",
    itens: ["Salários", "Pró-labore", "Encargos / INSS / FGTS", "Vale Transporte", "Vale Refeição"],
  },
  {
    grupo: "Logística / Combustível",
    itens: ["Combustível / Gasolina", "Manutenção de Veículo", "Frete / Entregas", "App de Entregadores"],
  },
  {
    grupo: "Marketing",
    itens: ["Publicidade / Anúncios", "Spots / Comerciais", "Mídia Social / Tráfego Pago", "Material Gráfico"],
  },
  {
    grupo: "Administrativo",
    itens: ["Contador / Honorários", "Taxas e Tarifas Bancárias", "Software / Sistemas", "Material de Escritório"],
  },
  {
    grupo: "Manutenção / Serviços",
    itens: ["Manutenção de Equipamentos", "Consultoria", "Segurança / Monitoramento", "Limpeza / Dedetização"],
  },
];

const CATEGORIAS = CATEGORIAS_GRUPOS.flatMap((g) => g.itens);

interface ContaPagar {
  id: string;
  fornecedor: string;
  cnpj_fornecedor: string | null;
  descricao: string | null;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  data_emissao: string | null;
  banco: string | null;
  categoria: string | null;
  subcategoria: string | null;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  nota_fiscal_id: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
}

type Filtro = "todas" | "a_pagar" | "pagas" | "atrasadas" | "semana" | "mes";

interface ParcelaPreview {
  numero: number;
  valor: number;
  vencimento: string;
}

interface FormData {
  fornecedor: string;
  descricao: string;
  valor_total: string;
  num_parcelas: number;
  primeiro_vencimento: string;
  intervalo_dias: number;
  categoria: string;
  subcategoria: string;
}

const emptyForm: FormData = {
  fornecedor: "",
  descricao: "",
  valor_total: "",
  num_parcelas: 1,
  primeiro_vencimento: "",
  intervalo_dias: 30,
  categoria: "Proteínas / Açougue",
  subcategoria: "",
};

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const addDaysISO = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function FinanceiroContasPagar() {
  const queryClient = useQueryClient();
  const unidadeId = getActiveUnidadeId();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pagarConta, setPagarConta] = useState<ContaPagar | null>(null);
  const [pagamento, setPagamento] = useState({
    data: new Date().toISOString().slice(0, 10),
    valor: 0,
    forma: "PIX",
  });

  // Atualiza status atrasado ao abrir a página
  useEffect(() => {
    supabase.rpc("atualizar_contas_atrasadas").then(() => {
      queryClient.invalidateQueries({ queryKey: ["contas_a_pagar"] });
    });
  }, [queryClient]);

  const { data: contas = [] } = useQuery({
    queryKey: ["contas_a_pagar", unidadeId],
    queryFn: async () => {
      if (!unidadeId) return [];
      const { data, error } = await supabase
        .from("contas_a_pagar")
        .select("*")
        .eq("unidade_id", unidadeId)
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data as ContaPagar[];
    },
    enabled: !!unidadeId,
  });

  const cards = useMemo(() => {
    let totalAPagar = 0, totalPagoMes = 0, atrasadas = 0, totalAtrasado = 0, vence7d = 0;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const em7 = new Date(hoje); em7.setDate(em7.getDate() + 7);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    contas.forEach((c) => {
      const v = Number(c.valor);
      if (c.status === "pago") {
        if (c.data_pagamento && new Date(c.data_pagamento + "T00:00:00") >= inicioMes) totalPagoMes += v;
      } else if (c.status === "atrasado") {
        atrasadas++;
        totalAtrasado += v;
        totalAPagar += v;
      } else if (c.status === "pendente") {
        totalAPagar += v;
        const venc = new Date(c.data_vencimento + "T00:00:00");
        if (venc >= hoje && venc <= em7) vence7d++;
      }
    });
    return { totalAPagar, totalPagoMes, atrasadas, totalAtrasado, vence7d };
  }, [contas]);

  const filtered = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const fimSemana = new Date(hoje); fimSemana.setDate(fimSemana.getDate() + 7);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return contas.filter((c) => {
      if (filtro === "a_pagar") return c.status === "pendente" || c.status === "atrasado";
      if (filtro === "pagas") return c.status === "pago";
      if (filtro === "atrasadas") return c.status === "atrasado";
      if (filtro === "semana") {
        if (c.status !== "pendente" && c.status !== "atrasado") return false;
        const venc = new Date(c.data_vencimento + "T00:00:00");
        return venc <= fimSemana;
      }
      if (filtro === "mes") {
        if (c.status !== "pendente" && c.status !== "atrasado") return false;
        const venc = new Date(c.data_vencimento + "T00:00:00");
        return venc <= fimMes;
      }
      return true;
    });
  }, [contas, filtro]);

  // ===== Mutations =====
  const valorTotalNum = parseFloat(form.valor_total) || 0;
  const parcelas: ParcelaPreview[] = useMemo(() => {
    if (!form.primeiro_vencimento || form.num_parcelas < 1 || valorTotalNum <= 0) return [];
    const valorParcela = Math.round((valorTotalNum / form.num_parcelas) * 100) / 100;
    const out: ParcelaPreview[] = [];
    for (let i = 0; i < form.num_parcelas; i++) {
      out.push({
        numero: i + 1,
        valor: valorParcela,
        vencimento: addDaysISO(form.primeiro_vencimento, i * form.intervalo_dias),
      });
    }
    // Ajusta a última para fechar a soma
    const soma = out.reduce((a, b) => a + b.valor, 0);
    const diff = Math.round((valorTotalNum - soma) * 100) / 100;
    if (diff !== 0 && out.length > 0) out[out.length - 1].valor += diff;
    return out;
  }, [form.primeiro_vencimento, form.num_parcelas, form.intervalo_dias, valorTotalNum]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const unidade_id = requireActiveUnidadeId();

      if (editingId) {
        const { error } = await supabase
          .from("contas_a_pagar")
          .update({
            fornecedor: form.fornecedor,
            descricao: form.descricao || null,
            valor: valorTotalNum,
            data_vencimento: form.primeiro_vencimento,
            categoria: form.categoria,
            subcategoria: form.subcategoria || null,
          })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const rows = parcelas.map((p) => ({
          fornecedor: form.fornecedor,
          descricao: form.descricao || null,
          numero_parcela: p.numero,
          total_parcelas: form.num_parcelas,
          valor: p.valor,
          data_vencimento: p.vencimento,
          categoria: form.categoria,
          subcategoria: form.subcategoria || null,
          status: "pendente" as const,
          user_id: auth.user.id,
          unidade_id,
          origem: "manual",
        }));
        const { error } = await supabase.from("contas_a_pagar").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_a_pagar"] });
      toast.success(editingId ? "Conta atualizada!" : `${form.num_parcelas} parcela(s) criada(s)!`);
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => appError("ERR-FIN-020", e),
  });

  const pagarMutation = useMutation({
    mutationFn: async () => {
      if (!pagarConta) return;
      const { data, error } = await supabase.rpc("marcar_conta_paga", {
        p_conta_id: pagarConta.id,
        p_data_pagamento: pagamento.data,
        p_valor_pago: pagamento.valor,
        p_forma_pagamento: pagamento.forma,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_a_pagar"] });
      queryClient.invalidateQueries({ queryKey: ["lancamentos_financeiros_contas"] });
      toast.success("Pagamento registrado!");
      setPagarConta(null);
    },
    onError: (e: Error) => toast.error(e.message ?? "Erro ao registrar pagamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas_a_pagar").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_a_pagar"] });
      toast.success("Conta excluída!");
      setDeleteId(null);
    },
  });

  const openEdit = (c: ContaPagar) => {
    setEditingId(c.id);
    setForm({
      fornecedor: c.fornecedor,
      descricao: c.descricao ?? "",
      valor_total: String(c.valor),
      num_parcelas: 1,
      primeiro_vencimento: c.data_vencimento,
      intervalo_dias: 30,
      categoria: c.categoria ?? "Proteínas / Açougue",
      subcategoria: c.subcategoria ?? "",
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, primeiro_vencimento: new Date().toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const openPagar = (c: ContaPagar) => {
    setPagarConta(c);
    setPagamento({
      data: new Date().toISOString().slice(0, 10),
      valor: Number(c.valor),
      forma: "PIX",
    });
  };

  const statusBadge = (s: string) => {
    if (s === "pago") return <Badge className="bg-success/15 text-success hover:bg-success/15 border-success/20">Pago</Badge>;
    if (s === "atrasado") return <Badge variant="destructive">Atrasado</Badge>;
    if (s === "cancelado") return <Badge variant="outline">Cancelado</Badge>;
    return <Badge variant="outline">A pagar</Badge>;
  };

  return (
    <div className="space-y-6 page-enter">
      <FinanceiroCategoryTabs />
      <PageHeader title="Contas a Pagar" description="Boletos e parcelas pendentes.">
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </PageHeader>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: "Total a Pagar",
            value: fmt(cards.totalAPagar),
          },
          {
            label: "Pago no Mês",
            value: fmt(cards.totalPagoMes),
          },
          {
            label: "Atrasadas",
            value: String(cards.atrasadas),
            icon: cards.atrasadas > 0 ? <AlertTriangle className="h-5 w-5 text-amber-300" /> : null,
            sub: cards.totalAtrasado > 0 ? fmt(cards.totalAtrasado) : null,
          },
          {
            label: "Vencem em 7 dias",
            value: String(cards.vence7d),
            icon: cards.vence7d > 0 ? <Clock className="h-5 w-5 text-amber-300" /> : null,
          },
        ].map((c, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary via-primary to-primary/80 p-4 shadow-lg text-primary-foreground fade-up"
          >
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-primary-foreground/70 font-semibold mb-2">
                {c.label}
              </p>
              <div className="flex items-center gap-2">
                <div className="text-[22px] sm:text-[26px] tabular-nums leading-none num-depth-light">
                  {c.value}
                </div>
                {c.icon}
              </div>
              {c.sub && (
                <p className="text-[11px] text-primary-foreground/80 mt-1.5 tabular-nums">{c.sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["todas", "Todas"],
          ["a_pagar", "A Pagar"],
          ["pagas", "Pagas"],
          ["atrasadas", "Atrasadas"],
          ["semana", "Esta Semana"],
          ["mes", "Este Mês"],
        ] as [Filtro, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={filtro === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltro(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className={c.status === "atrasado" ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium">{c.fornecedor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.descricao ?? "—"}</TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {c.numero_parcela}/{c.total_parcelas}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(Number(c.valor))}</TableCell>
                  <TableCell className="text-center text-sm">{formatDate(c.data_vencimento)}</TableCell>
                  <TableCell className="text-center">{statusBadge(c.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {c.status !== "pago" && c.status !== "cancelado" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-success hover:text-success"
                          title="Marcar como paga"
                          onClick={() => openPagar(c)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma conta encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fornecedor</Label>
                <Input
                  value={form.fornecedor}
                  onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                  placeholder="Ex: BRF S.A."
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {CATEGORIAS_GRUPOS.map((g) => (
                      <SelectGroup key={g.grupo}>
                        <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                          {g.grupo}
                        </SelectLabel>
                        {g.itens.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Frangos congelados"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Valor Total (R$)</Label>
                <MoneyInput
                  value={valorTotalNum}
                  onChange={(v) => setForm({ ...form, valor_total: String(v) })}
                />
              </div>
              <div>
                <Label>Nº de Parcelas</Label>
                <Input
                  type="number" min={1} max={36}
                  value={form.num_parcelas}
                  disabled={!!editingId}
                  onChange={(e) => setForm({ ...form, num_parcelas: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div>
                <Label>Intervalo (dias)</Label>
                <Input
                  type="number" min={1}
                  value={form.intervalo_dias}
                  disabled={!!editingId || form.num_parcelas <= 1}
                  onChange={(e) => setForm({ ...form, intervalo_dias: Math.max(1, parseInt(e.target.value) || 30) })}
                />
              </div>
            </div>
            <div>
              <Label>{editingId ? "Vencimento" : "Primeiro Vencimento"}</Label>
              <Input
                type="date"
                value={form.primeiro_vencimento}
                onChange={(e) => setForm({ ...form, primeiro_vencimento: e.target.value })}
              />
            </div>

            {!editingId && parcelas.length > 1 && (
              <div className="rounded-md border p-3 bg-muted/30 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Pré-visualização</p>
                <div className="space-y-1">
                  {parcelas.map((p) => (
                    <div key={p.numero} className="text-sm flex justify-between font-mono">
                      <span>Parcela {p.numero}/{form.num_parcelas}</span>
                      <span>{fmt(p.valor)}</span>
                      <span>{formatDate(p.vencimento)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                !form.fornecedor || valorTotalNum <= 0 || !form.primeiro_vencimento || saveMutation.isPending
              }
            >
              {editingId ? "Salvar" : `Criar ${form.num_parcelas} parcela(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pagar Dialog */}
      <Dialog open={!!pagarConta} onOpenChange={(o) => !o && setPagarConta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          {pagarConta && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Fornecedor</span><span className="font-semibold">{pagarConta.fornecedor}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Parcela</span><span className="font-mono">{pagarConta.numero_parcela}/{pagarConta.total_parcelas}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span>{formatDate(pagarConta.data_vencimento)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor original</span><span className="font-mono">{fmt(Number(pagarConta.valor))}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={pagamento.data}
                    onChange={(e) => setPagamento({ ...pagamento, data: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valor Pago</Label>
                  <MoneyInput
                    value={pagamento.valor}
                    onChange={(v) => setPagamento({ ...pagamento, valor: v })}
                  />
                </div>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={pagamento.forma} onValueChange={(v) => setPagamento({ ...pagamento, forma: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagarConta(null)}>Cancelar</Button>
            <Button onClick={() => pagarMutation.mutate()} disabled={pagarMutation.isPending}>
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
