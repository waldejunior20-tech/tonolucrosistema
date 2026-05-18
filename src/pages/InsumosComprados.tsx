import { SkeletonTable } from "@/components/SkeletonCard";
import { useState, useMemo, useEffect, useRef } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { Pencil, Trash2, Plus, Filter, Package, ChevronDown, LayoutGrid, List, History, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { MoneyInput, QuantityInput, formatMoney, formatQuantidade } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { InsumosCategoryTabs } from "@/components/insumos/InsumosCategoryTabs";

import { EmptyState } from "@/components/EmptyState";
import { fieldErrorClass, FieldError } from "@/components/FormFieldError";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Money } from "@/components/Money";

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

type ViewMode = "grouped" | "list";

export default function InsumosComprados() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [submitted, setSubmitted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const lastCreatedCatRef = useRef<string | null>(null);

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

  // Fetch cadastro canônico
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

  // Fetch view canônica (variação + uso em fichas)
  const { data: canon = [] } = useQuery({
    queryKey: ["insumos_canonicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_insumos_canonicos" as any)
        .select("id, variacao_pct, usado_em_fichas, preco_anterior");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; variacao_pct: number | null; usado_em_fichas: number; preco_anterior: number | null }[];
    },
  });
  const canonMap = useMemo(() => {
    const m = new Map<string, { variacao_pct: number | null; usado_em_fichas: number; preco_anterior: number | null }>();
    canon.forEach((c) => m.set(c.id, c));
    return m;
  }, [canon]);

  // After insumos refetch following create, expand category & highlight new item
  useEffect(() => {
    const cat = lastCreatedCatRef.current;
    if (!cat || insumos.length === 0) return;
    // Find newest item in that category
    const newest = [...insumos]
      .filter((i) => i.categoria === cat)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
    if (newest) {
      setCollapsedCats((prev) => {
        const next = new Set(prev);
        next.delete(cat);
        return next;
      });
      setHighlightId(newest.id);
      const t = setTimeout(() => setHighlightId(null), 1500);
      lastCreatedCatRef.current = null;
      return () => clearTimeout(t);
    }
  }, [insumos]);

  // Insert
  const insertMutation = useMutation({
    mutationFn: async (payload: TablesInsert<"insumos_comprados">) => {
      const unidade_id = requireActiveUnidadeId();
      const { error } = await supabase.from("insumos_comprados").insert({ ...payload, unidade_id });
      if (error) throw error;
    },
    onSuccess: (_d, variables) => {
      lastCreatedCatRef.current = variables.categoria;
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

  // Mapa de duplicatas: nome normalizado -> contagem
  const dupCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of insumos) {
      const k = i.nome.trim().toLowerCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [insumos]);

  const isDup = (nome: string) => (dupCount.get(nome.trim().toLowerCase()) ?? 0) > 1;

  // Grouped data: keep the order of CATEGORIAS list, plus any unknown categories at the end
  const grouped = useMemo(() => {
    const map = new Map<string, Insumo[]>();
    for (const i of filtered) {
      const arr = map.get(i.categoria) ?? [];
      arr.push(i);
      map.set(i.categoria, arr);
    }
    // sort items A→Z within each group
    for (const arr of map.values()) {
      arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
    const ordered: Array<{ categoria: string; itens: Insumo[] }> = [];
    for (const c of CATEGORIAS) {
      if (map.has(c)) {
        ordered.push({ categoria: c, itens: map.get(c)! });
        map.delete(c);
      }
    }
    // unknown categories
    for (const [c, itens] of map) {
      ordered.push({ categoria: c, itens });
    }
    return ordered;
  }, [filtered]);

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const showErr = (field: keyof typeof errors) => submitted && errors[field];

  const renderRow = (insumo: Insumo, idx: number) => {
    const c = canonMap.get(insumo.id);
    const variacao = c?.variacao_pct ?? null;
    const usado = c?.usado_em_fichas ?? 0;
    return (
      <TableRow
        key={insumo.id}
        className={cn(
          "border-b border-border/40 transition-colors hover:bg-primary/5",
          idx % 2 === 0 ? "bg-card" : "bg-muted/20",
          highlightId === insumo.id && "bg-primary/15 animate-pulse",
        )}
      >
        <TableCell className="font-bold text-foreground">
          <div className="flex items-center gap-2">
            <span>{insumo.nome}</span>
            {isDup(insumo.nome) && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                title="Existe outro insumo com o mesmo nome — considere mesclar"
              >
                ⚠ DUPLICADO
              </span>
            )}
          </div>
        </TableCell>
        {viewMode === "list" && (
          <TableCell>
            <CategoryBadge categoria={insumo.categoria} />
          </TableCell>
        )}
        <TableCell className="text-right tabular-nums font-bold text-foreground">
          {<Money value={Number(insumo.preco_pago)} />}
        </TableCell>
        <TableCell className="text-right tabular-nums text-foreground">
          {formatQuantidade(Number(insumo.quantidade), insumo.unidade)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {variacao === null ? (
            <span className="text-muted-foreground text-xs">—</span>
          ) : Math.abs(variacao) < 0.5 ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
              <Minus className="h-3 w-3" /> estável
            </span>
          ) : variacao > 0 ? (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-bold">
              <TrendingUp className="h-3 w-3" /> +{variacao.toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingDown className="h-3 w-3" /> {variacao.toFixed(1)}%
            </span>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">{insumo.fornecedor ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground tabular-nums">
          {insumo.data_compra
            ? new Date(insumo.data_compra + "T00:00:00").toLocaleDateString("pt-BR")
            : "—"}
        </TableCell>
        <TableCell className="text-center tabular-nums">
          {usado > 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{usado}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              onClick={() => handleEdit(insumo)}
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
              aria-label="Ver histórico"
            >
              <Link to={`/compras/historico?insumo=${encodeURIComponent(insumo.nome)}`}>
                <History className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => deleteMutation.mutate(insumo.id)}
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const headerCells = (
    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Nome</TableHead>
      {viewMode === "list" && (
        <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Categoria</TableHead>
      )}
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Preço atual</TableHead>
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Quantidade</TableHead>
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Variação</TableHead>
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Último fornecedor</TableHead>
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Última compra</TableHead>
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-center">Em fichas</TableHead>
      <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider w-[120px]">Ações</TableHead>
    </TableRow>
  );

  return (
    <div className="space-y-6 page-enter">
      <InsumosCategoryTabs />
      
      <PageHeader title="Insumos Comprados" description="Cadastro atual dos ingredientes que montam suas fichas técnicas. O preço é atualizado pela compra mais recente.">
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
                  <QuantityInput id="qtd" className={fieldErrorClass(showErr("quantidade"))} value={form.quantidade} unidade={form.unidade} onChange={(v) => setForm({ ...form, quantidade: v })} />
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

      {/* Filtro + Toggle de visualização */}
      <div className="flex items-center gap-3 flex-wrap">
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

        <div className="ml-auto">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="grouped" aria-label="Visualização agrupada" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Agrupada
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Visualização em lista" className="gap-1.5">
              <List className="h-4 w-4" /> Lista
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum insumo encontrado"
          description="Cadastre seus insumos para começar a montar fichas técnicas."
          actionLabel="Cadastrar Insumo"
          onAction={() => setDialogOpen(true)}
        />
      ) : viewMode === "list" ? (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm fade-up fade-up-d1">
          <Table>
            <TableHeader>{headerCells}</TableHeader>
            <TableBody>
              {filtered.map((insumo, idx) => renderRow(insumo, idx))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-4 fade-up fade-up-d1">
          {grouped.map(({ categoria, itens }) => {
            const collapsed = collapsedCats.has(categoria);
            return (
              <Collapsible
                key={categoria}
                open={!collapsed}
                onOpenChange={() => toggleCat(categoria)}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryBadge categoria={categoria} />
                      <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                        ({itens.length})
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        collapsed && "-rotate-90",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>{headerCells}</TableHeader>
                    <TableBody>
                      {itens.map((insumo, idx) => renderRow(insumo, idx))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
