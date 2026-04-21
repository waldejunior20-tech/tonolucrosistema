import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Plus, Pencil, Trash2, Check, AlertTriangle, Clock, CircleDollarSign } from "lucide-react";
import { MoneyInput } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORIAS = [
  { value: "cmv", label: "CMV" },
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

const catLabel = (cat: string) => CATEGORIAS.find((c) => c.value === cat)?.label ?? cat;

interface Lancamento {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  data_lancamento: string;
  pago: boolean;
}

type Filtro = "todas" | "a_pagar" | "pagas" | "atrasadas";

interface FormData {
  descricao: string;
  valor: string;
  categoria: string;
  data_lancamento: string;
}

const emptyForm: FormData = { descricao: "", valor: "", categoria: "outros", data_lancamento: "" };

export default function FinanceiroContasPagar() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();
  const startDate = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-01`;
  const endDate = mesAtual === 12
    ? `${anoAtual + 1}-01-01`
    : `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}-01`;

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["lancamentos_financeiros_contas", mesAtual, anoAtual],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .eq("tipo", "despesa")
        .gte("data_lancamento", startDate)
        .lt("data_lancamento", endDate)
        .order("data_lancamento", { ascending: true });
      if (error) throw error;
      return data as Lancamento[];
    },
  });

  const getStatus = (l: Lancamento) => {
    if (l.pago) return "pago";
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(l.data_lancamento + "T00:00:00");
    const diff = (venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "atrasado";
    if (diff <= 7) return "vence_7d";
    return "a_pagar";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge variant="default" className="bg-success/15 text-success hover:bg-success/15 border-success/20">Pago</Badge>;
      case "atrasado":
        return <Badge variant="destructive">Atrasado</Badge>;
      case "vence_7d":
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/15 border-warning/20">Vence em 7 dias</Badge>;
      default:
        return <Badge variant="outline">A pagar</Badge>;
    }
  };

  const filtered = useMemo(() => {
    return lancamentos.filter((l) => {
      const status = getStatus(l);
      if (filtro === "a_pagar") return status === "a_pagar" || status === "vence_7d";
      if (filtro === "pagas") return status === "pago";
      if (filtro === "atrasadas") return status === "atrasado";
      return true;
    });
  }, [lancamentos, filtro]);

  const cards = useMemo(() => {
    let totalAPagar = 0, totalPago = 0, atrasadas = 0, vence7d = 0;
    lancamentos.forEach((l) => {
      const status = getStatus(l);
      if (status === "pago") totalPago += Number(l.valor);
      else totalAPagar += Number(l.valor);
      if (status === "atrasado") atrasadas++;
      if (status === "vence_7d") vence7d++;
    });
    return { totalAPagar, totalPago, atrasadas, vence7d };
  }, [lancamentos]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const basePayload = {
        descricao: form.descricao,
        valor: parseFloat(form.valor) || 0,
        tipo: "despesa" as const,
        categoria: form.categoria,
        data_lancamento: form.data_lancamento,
        pago: false,
      };
      if (editingId) {
        const { error } = await supabase
          .from("lancamentos_financeiros")
          .update(basePayload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Sessão expirada");
        const unidade_id = requireActiveUnidadeId();
        const { error } = await supabase
          .from("lancamentos_financeiros")
          .insert({ ...basePayload, unidade_id, user_id: auth.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos_financeiros_contas"] });
      toast.success(editingId ? "Conta atualizada!" : "Conta adicionada!");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (e) => appError("ERR-FIN-020", e),
  });

  const togglePagoMutation = useMutation({
    mutationFn: async ({ id, pago }: { id: string; pago: boolean }) => {
      const { error } = await supabase
        .from("lancamentos_financeiros")
        .update({ pago })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos_financeiros_contas"] });
      toast.success("Status atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lancamentos_financeiros")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lancamentos_financeiros_contas"] });
      toast.success("Conta excluída!");
      setDeleteId(null);
    },
  });

  const openEdit = (l: Lancamento) => {
    setEditingId(l.id);
    setForm({
      descricao: l.descricao,
      valor: String(l.valor),
      categoria: l.categoria,
      data_lancamento: l.data_lancamento,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm, data_lancamento: now.toISOString().slice(0, 10) });
    setDialogOpen(true);
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Contas a Pagar" description="Controle de contas e pagamentos pendentes.">
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </PageHeader>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Card>
          <CardContent className="pt-7 pb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total a Pagar</p>
            <p className="text-2xl font-extrabold text-destructive">{fmt(cards.totalAPagar)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-7 pb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Pago no Mês</p>
            <p className="text-2xl font-extrabold text-success">{fmt(cards.totalPago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-7 pb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Atrasadas</p>
            <p className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              {cards.atrasadas}
              {cards.atrasadas > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-7 pb-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vencem em 7 dias</p>
            <p className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              {cards.vence7d}
              {cards.vence7d > 0 && <Clock className="h-5 w-5 text-warning" />}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([
          ["todas", "Todas"],
          ["a_pagar", "A Pagar"],
          ["pagas", "Pagas"],
          ["atrasadas", "Atrasadas"],
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
                <TableHead className="min-w-[200px]">Descrição</TableHead>
                <TableHead className="">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Vencimento</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const status = getStatus(l);
                return (
                  <TableRow key={l.id} className={status === "atrasado" ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{l.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{catLabel(l.categoria)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(Number(l.valor))}</TableCell>
                    <TableCell className="text-center text-sm">{formatDate(l.data_lancamento)}</TableCell>
                    <TableCell className="text-center">{statusBadge(status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {!l.pago && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-success hover:text-success"
                            title="Marcar como pago"
                            onClick={() => togglePagoMutation.mutate({ id: l.id, pago: true })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {l.pago && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground"
                            title="Desfazer pagamento"
                            onClick={() => togglePagoMutation.mutate({ id: l.id, pago: false })}
                          >
                            <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(l)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(l.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Aluguel do ponto"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <MoneyInput
                  value={parseFloat(form.valor) || 0}
                  onChange={(v) => setForm({ ...form, valor: String(v) })}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={form.data_lancamento}
                  onChange={(e) => setForm({ ...form, data_lancamento: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.descricao || !form.valor || !form.data_lancamento}
            >
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
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
