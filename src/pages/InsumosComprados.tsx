import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Pencil, Trash2, Plus, Filter, Package } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { MoneyInput, QuantityInput, formatMoney, formatQty } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { fieldErrorClass, FieldError } from "@/components/FormFieldError";

const CATEGORIAS = [
  "Proteínas", "Laticínios", "Hortifruti", "Secos", "Bebidas",
  "Molhos e Condimentos", "Embalagens", "Congelados", "Confeitaria",
];

const UNIDADES = ["kg", "g", "L", "ml", "unidade", "caixa", "pacote"];

type Insumo = Tables<"insumos_comprados">;

const emptyForm: Omit<TablesInsert<"insumos_comprados">, "id" | "created_at" | "updated_at"> = {
  nome: "",
  categoria: "",
  preco_pago: 0,
  quantidade: 0,
  unidade: "",
  fornecedor: "",
  data_compra: "",
  codigo: "",
};

export default function InsumosComprados() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [submitted, setSubmitted] = useState(false);

  // Validation
  const errors = {
    nome: !form.nome.trim(),
    categoria: !form.categoria,
    preco_pago: !form.preco_pago,
    quantidade: !form.quantidade,
    unidade: !form.unidade,
    fornecedor: !(form.fornecedor ?? "").trim(),
    data_compra: !(form.data_compra ?? "").trim(),
  };
  const formIsValid = !Object.values(errors).some(Boolean);

  // Fetch
  const { data: insumos = [], isLoading } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Insumo[];
    },
  });

  // Insert
  const insertMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"insumos_comprados">) => {
      const { error } = await supabase.from("insumos_comprados").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_comprados"] });
      toast.success("Insumo cadastrado com sucesso!");
      resetForm();
    },
    onError: (e) => appError("ERR-INS-001", e),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: TablesInsert<"insumos_comprados"> & { id: string }) => {
      const { error } = await supabase.from("insumos_comprados").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_comprados"] });
      toast.success("Insumo atualizado!");
      resetForm();
    },
    onError: (e) => appError("ERR-INS-002", e),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insumos_comprados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos_comprados"] });
      toast.success("Insumo excluído!");
    },
    onError: (e) => appError("ERR-INS-003", e),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    setSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!formIsValid) return;
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId });
    } else {
      insertMutation.mutate(form);
    }
  };

  const handleEdit = (insumo: Insumo) => {
    setForm({
      nome: insumo.nome,
      categoria: insumo.categoria,
      preco_pago: insumo.preco_pago,
      quantidade: insumo.quantidade,
      unidade: insumo.unidade,
      fornecedor: insumo.fornecedor ?? "",
      data_compra: insumo.data_compra ?? "",
      codigo: insumo.codigo ?? "",
    });
    setEditingId(insumo.id);
    setSubmitted(false);
    setDialogOpen(true);
  };

  const filtered = filtroCategoria === "todas"
    ? insumos
    : insumos.filter((i) => i.categoria === filtroCategoria);

  const showErr = (field: keyof typeof errors) => submitted && errors[field];

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Insumos Comprados" description="Gerencie seus insumos e matérias-primas.">
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="btn-action-add gap-2">
              <Plus className="h-4 w-4" /> Novo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Insumo" : "Cadastrar Insumo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" className={fieldErrorClass(showErr("nome"))} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                  <FieldError show={showErr("nome")} />
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger className={fieldErrorClass(showErr("categoria"))}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError show={showErr("categoria")} />
                </div>
                <div>
                  <Label>Unidade *</Label>
                  <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                    <SelectTrigger className={fieldErrorClass(showErr("unidade"))}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldError show={showErr("unidade")} />
                </div>
                <div>
                  <Label htmlFor="preco">Preço Pago (R$) *</Label>
                  <MoneyInput id="preco" className={fieldErrorClass(showErr("preco_pago"))} value={form.preco_pago} onChange={(v) => setForm({ ...form, preco_pago: v })} />
                  <FieldError show={showErr("preco_pago")} />
                </div>
                <div>
                  <Label htmlFor="qtd">Quantidade *</Label>
                  <QuantityInput id="qtd" className={fieldErrorClass(showErr("quantidade"))} value={form.quantidade} onChange={(v) => setForm({ ...form, quantidade: v })} />
                  <FieldError show={showErr("quantidade")} />
                </div>
                <div>
                  <Label htmlFor="fornecedor">Fornecedor *</Label>
                  <Input id="fornecedor" className={fieldErrorClass(showErr("fornecedor"))} value={form.fornecedor ?? ""} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
                  <FieldError show={showErr("fornecedor")} />
                </div>
                <div>
                  <Label htmlFor="data">Data da Compra *</Label>
                  <Input id="data" type="date" className={fieldErrorClass(showErr("data_compra"))} value={form.data_compra ?? ""} onChange={(e) => setForm({ ...form, data_compra: e.target.value })} />
                  <FieldError show={showErr("data_compra")} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={insertMutation.isPending || updateMutation.isPending || (submitted && !formIsValid)}>
                  {editingId ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum insumo encontrado"
          description="Cadastre seus insumos para começar a montar fichas técnicas."
          actionLabel="Cadastrar Insumo"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="table-premium fade-up fade-up-d1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço (R$)</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data Compra</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((insumo) => (
                <TableRow key={insumo.id}>
                  <TableCell className="font-bold text-[#1A1A1A]">{insumo.nome}</TableCell>
                  <TableCell>{insumo.categoria}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(Number(insumo.preco_pago))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatQty(Number(insumo.quantidade))}</TableCell>
                  <TableCell>{insumo.unidade}</TableCell>
                  <TableCell>{insumo.fornecedor ?? "—"}</TableCell>
                  <TableCell>
                    {insumo.data_compra
                      ? new Date(insumo.data_compra + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(insumo)}>
                        <Pencil className="h-4 w-4 text-[#16A273]" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(insumo.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}
