import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProductCosts, type ProductItem } from "@/hooks/useProductCosts";
import { fmt } from "@/lib/pricing-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus, Pencil, Copy, Trash2, Pause, Play, AlertTriangle, Search, X,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────
const TIPO_LABELS: Record<string, string> = {
  preco_fixo: "Preço Fixo",
  desconto_percentual: "Desconto %",
  desconto_valor_fixo: "Desconto R$",
  leve_mais_por_menos: "Leve + por -",
  brinde: "Brinde",
  adicional_gratis: "Adicional Grátis",
  por_categoria: "Por Categoria",
};

const CATEGORIAS = [
  "tradicional", "especial", "premium", "doce",
  "sanduiche", "prato", "sobremesa", "bebida", "Bebidas",
];
const CATEGORIA_LABELS: Record<string, string> = {
  tradicional: "Pizza Tradicional",
  especial: "Pizza Especial",
  premium: "Pizza Premium",
  doce: "Pizza Doce",
  sanduiche: "Sanduíches e Lanches",
  prato: "Pratos",
  sobremesa: "Sobremesas",
  bebida: "Bebidas Preparadas",
  Bebidas: "Bebidas Industrializadas",
};

const DIAS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
];

const statusColor = (s: string) => {
  switch (s) {
    case "ativa": return "bg-success/15 text-success border-success/30";
    case "agendada": return "bg-info/15 text-info border-info/30";
    case "encerrada": return "bg-muted text-muted-foreground border-border";
    case "inativa": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const lucroColor = (pct: number) => {
  if (pct >= 30) return "text-success";
  if (pct >= 15) return "text-warning";
  if (pct > 0) return "text-orange";
  return "text-destructive";
};

const lucroEmoji = (pct: number) => {
  if (pct >= 30) return "●";
  if (pct >= 15) return "●";
  if (pct > 0) return "●";
  return "●";
};

const lucroBadgeCls = (pct: number) => {
  if (pct >= 30) return "bg-success/15 text-success border-success/30";
  if (pct >= 15) return "bg-warning/15 text-warning border-warning/30";
  if (pct > 0) return "bg-orange/15 text-orange border-orange/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
};

// ─── Types ────────────────────────────────────────────────────────────
interface Promocao {
  id: string;
  nome: string;
  tipo: string;
  produto_ids: string[];
  categoria_alvo: string | null;
  regra_descricao: string | null;
  valor_original: number | null;
  desconto_aplicado: number | null;
  preco_final_promocional: number | null;
  lucro_real_rs: number | null;
  lucro_real_pct: number | null;
  margem_minima_aceitavel: number | null;
  data_inicio: string;
  data_fim: string | null;
  dias_semana: string[];
  horario_inicio: string | null;
  horario_fim: string | null;
  status: string;
}

interface FormData {
  nome: string;
  tipo: string;
  produto_ids: string[];
  categoria_alvo: string;
  desconto_aplicado: number;
  preco_final_promocional: number;
  regra_descricao: string;
  quantidade_leve: number;
  brinde_nome: string;
  adicional_nome: string;
  data_inicio: string;
  data_fim: string;
  dias_semana: string[];
  horario_inicio: string;
  horario_fim: string;
  margem_minima_aceitavel: number;
}

const emptyForm: FormData = {
  nome: "",
  tipo: "desconto_percentual",
  produto_ids: [],
  categoria_alvo: "",
  desconto_aplicado: 0,
  preco_final_promocional: 0,
  regra_descricao: "",
  quantidade_leve: 2,
  brinde_nome: "",
  adicional_nome: "",
  data_inicio: new Date().toISOString().split("T")[0],
  data_fim: "",
  dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
  horario_inicio: "",
  horario_fim: "",
  margem_minima_aceitavel: 30,
};

// ─── Component ────────────────────────────────────────────────────────
export default function PromocoesAtivas() {
  const queryClient = useQueryClient();
  const { allProducts, uniqueProducts } = useProductCosts();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState("todas");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [productSearch, setProductSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPrejuizoConfirm, setShowPrejuizoConfirm] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: promocoes = [], isLoading } = useQuery({
    queryKey: ["promocoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promocoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Promocao[];
    },
  });

  const { data: configNegocio } = useQuery({
    queryKey: ["configuracoes_negocio"],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes_negocio").select("*").limit(1).single();
      return data;
    },
  });

  // ─── Filtered list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return promocoes.filter((p) => {
      if (filterStatus !== "todas" && p.status !== filterStatus) return false;
      if (filterTipo !== "todos" && p.tipo !== filterTipo) return false;
      return true;
    });
  }, [promocoes, filterStatus, filterTipo]);

  // ─── Calculations for form ─────────────────────────────────────
  const selectedProducts = useMemo(() => {
    if (form.tipo === "por_categoria" && form.categoria_alvo) {
      return allProducts.filter((p) => p.categoria === form.categoria_alvo);
    }
    const ids = new Set(form.produto_ids);
    return allProducts.filter((p) => ids.has(p.id));
  }, [form.produto_ids, form.tipo, form.categoria_alvo, allProducts]);

  const calculations = useMemo(() => {
    return selectedProducts.map((p) => {
      let precoFinal = p.precoVenda;
      let desconto = 0;

      switch (form.tipo) {
        case "preco_fixo":
          precoFinal = form.preco_final_promocional;
          desconto = p.precoVenda - precoFinal;
          break;
        case "desconto_percentual":
        case "por_categoria":
          desconto = p.precoVenda * (form.desconto_aplicado / 100);
          precoFinal = p.precoVenda - desconto;
          break;
        case "desconto_valor_fixo":
          desconto = form.desconto_aplicado;
          precoFinal = p.precoVenda - desconto;
          break;
        case "leve_mais_por_menos":
          precoFinal = form.preco_final_promocional / Math.max(form.quantidade_leve, 1);
          desconto = p.precoVenda - precoFinal;
          break;
        case "brinde":
        case "adicional_gratis":
          precoFinal = p.precoVenda;
          desconto = 0;
          break;
      }

      const lucroRs = precoFinal - p.custo;
      const lucroPct = precoFinal > 0 ? (lucroRs / precoFinal) * 100 : 0;

      return { ...p, precoFinal, desconto, lucroRs, lucroPct };
    });
  }, [selectedProducts, form]);

  const hasLoss = calculations.some((c) => c.lucroPct <= 0);

  // ─── Mutations ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const avgLucroRs = calculations.length
        ? calculations.reduce((a, c) => a + c.lucroRs, 0) / calculations.length : 0;
      const avgLucroPct = calculations.length
        ? calculations.reduce((a, c) => a + c.lucroPct, 0) / calculations.length : 0;
      const avgPrecoOriginal = calculations.length
        ? calculations.reduce((a, c) => a + c.precoVenda, 0) / calculations.length : 0;
      const avgPrecoFinal = calculations.length
        ? calculations.reduce((a, c) => a + c.precoFinal, 0) / calculations.length : 0;
      const avgDesconto = calculations.length
        ? calculations.reduce((a, c) => a + c.desconto, 0) / calculations.length : 0;

      let regra = form.regra_descricao;
      if (!regra) {
        switch (form.tipo) {
          case "preco_fixo": regra = `Preço fixo R$ ${form.preco_final_promocional}`; break;
          case "desconto_percentual": regra = `${form.desconto_aplicado}% de desconto`; break;
          case "desconto_valor_fixo": regra = `R$ ${form.desconto_aplicado} de desconto`; break;
          case "leve_mais_por_menos": regra = `Leve ${form.quantidade_leve} por R$ ${form.preco_final_promocional}`; break;
          case "brinde": regra = `Brinde: ${form.brinde_nome}`; break;
          case "adicional_gratis": regra = `Adicional grátis: ${form.adicional_nome}`; break;
          case "por_categoria": regra = `${form.desconto_aplicado}% em ${CATEGORIA_LABELS[form.categoria_alvo] ?? form.categoria_alvo}`; break;
        }
      }

      const payload = {
        nome: form.nome,
        tipo: form.tipo,
        produto_ids: form.produto_ids,
        categoria_alvo: form.tipo === "por_categoria" ? form.categoria_alvo : null,
        regra_descricao: regra,
        valor_original: avgPrecoOriginal,
        desconto_aplicado: avgDesconto,
        preco_final_promocional: avgPrecoFinal,
        lucro_real_rs: avgLucroRs,
        lucro_real_pct: avgLucroPct,
        margem_minima_aceitavel: form.margem_minima_aceitavel,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        dias_semana: form.dias_semana,
        horario_inicio: form.horario_inicio || null,
        horario_fim: form.horario_fim || null,
      };

      if (editingId) {
        const { error } = await supabase.from("promocoes").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promocoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promocoes"] });
      toast.success(editingId ? "Promoção atualizada!" : "Promoção criada!");
      closeForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promocoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promocoes"] });
      toast.success("Promoção excluída");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("promocoes").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promocoes"] });
      toast.success("Status atualizado");
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const openNew = () => {
    setForm({
      ...emptyForm,
      margem_minima_aceitavel: Number(configNegocio?.lucro_desejado_pct ?? 30),
    });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (p: Promocao) => {
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      produto_ids: p.produto_ids ?? [],
      categoria_alvo: p.categoria_alvo ?? "",
      desconto_aplicado: Number(p.desconto_aplicado ?? 0),
      preco_final_promocional: Number(p.preco_final_promocional ?? 0),
      regra_descricao: p.regra_descricao ?? "",
      quantidade_leve: 2,
      brinde_nome: "",
      adicional_nome: "",
      data_inicio: p.data_inicio,
      data_fim: p.data_fim ?? "",
      dias_semana: p.dias_semana ?? DIAS.map((d) => d.key),
      horario_inicio: p.horario_inicio ?? "",
      horario_fim: p.horario_fim ?? "",
      margem_minima_aceitavel: Number(p.margem_minima_aceitavel ?? 30),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const duplicatePromo = (p: Promocao) => {
    openEdit({ ...p, id: "" } as any);
    setEditingId(null);
    setForm((f) => ({ ...f, nome: `${p.nome} (cópia)` }));
  };

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.data_inicio) { toast.error("Data de início é obrigatória"); return; }
    if (form.tipo !== "por_categoria" && form.produto_ids.length === 0) {
      toast.error("Selecione ao menos um produto"); return;
    }
    if (hasLoss) {
      setShowPrejuizoConfirm(true);
      return;
    }
    saveMutation.mutate();
  };

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      produto_ids: f.produto_ids.includes(id)
        ? f.produto_ids.filter((x) => x !== id)
        : [...f.produto_ids, id],
    }));
  };

  const filteredProducts = useMemo(() => {
    const s = productSearch.toLowerCase();
    return uniqueProducts.filter((p) => p.nome.toLowerCase().includes(s));
  }, [uniqueProducts, productSearch]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Promoções Ativas</h1>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova Promoção</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="encerrada">Encerrada</SelectItem>
            <SelectItem value="inativa">Inativa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma promoção encontrada. Clique em "Nova Promoção" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-lg">{p.nome}</span>
                      <Badge className={`text-xs ${statusColor(p.status)}`}>
                        {p.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {TIPO_LABELS[p.tipo] ?? p.tipo}
                      </Badge>
                      {p.lucro_real_pct != null && (
                        <Badge className={`text-xs ${lucroBadgeCls(Number(p.lucro_real_pct))}`}>
                          {lucroEmoji(Number(p.lucro_real_pct))} {Number(p.lucro_real_pct).toFixed(1)}%
                          {Number(p.lucro_real_pct) <= 0 && (
                            <AlertTriangle className="ml-1 h-3 w-3 inline" />
                          )}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.regra_descricao}</p>
                    <div className="flex flex-wrap gap-4 text-sm font-mono">
                      {p.preco_final_promocional != null && (
                        <span>Preço: {fmt(Number(p.preco_final_promocional))}</span>
                      )}
                      {p.lucro_real_rs != null && (
                        <span className={lucroColor(Number(p.lucro_real_pct ?? 0))}>
                          Lucro: {fmt(Number(p.lucro_real_rs))}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {p.data_inicio}{p.data_fim ? ` → ${p.data_fim}` : " → sem prazo"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleStatusMutation.mutate({
                        id: p.id,
                        newStatus: p.status === "inativa" ? "ativa" : "inativa",
                      })}
                      title={p.status === "inativa" ? "Ativar" : "Pausar"}
                    >
                      {p.status === "inativa" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => duplicatePromo(p)} title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(p.id)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir promoção?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteMutation.mutate(showDeleteConfirm!); setShowDeleteConfirm(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prejuízo confirm */}
      <AlertDialog open={showPrejuizoConfirm} onOpenChange={setShowPrejuizoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Promoção com Prejuízo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta promoção gera PREJUÍZO em um ou mais produtos. Confirma mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowPrejuizoConfirm(false); saveMutation.mutate(); }}>
              Salvar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
            <DialogDescription>
              Configure os detalhes da promoção abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Section 1 - Identification */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome da promoção</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Happy Hour Sexta"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v, produto_ids: [], categoria_alvo: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 2 - Products/Targets */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Produtos / Alvos</h3>
              {form.tipo === "por_categoria" ? (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.categoria_alvo} onValueChange={(v) => setForm((f) => ({ ...f, categoria_alvo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c] ?? c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Buscar produto..."
                      className="pl-10"
                    />
                    {productSearch && (
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setProductSearch("")}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {form.produto_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {form.produto_ids.map((id) => {
                        const p = uniqueProducts.find((x) => x.id === id);
                        return (
                          <Badge key={id} variant="outline" className="gap-1 cursor-pointer" onClick={() => toggleProduct(id)}>
                            {p?.nome ?? "?"} <X className="h-3 w-3" />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                    {filteredProducts.map((p) => (
                      <label
                        key={`${p.tipo}-${p.id}`}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                      >
                        <Checkbox
                          checked={form.produto_ids.includes(p.id)}
                          onCheckedChange={() => toggleProduct(p.id)}
                        />
                        <span className="flex-1 text-sm">{p.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {p.tipo === "pizza" ? "Pizza" : p.tipo === "bebida" ? "Bebida" : "Produto"}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">{fmt(p.precoVenda)}</span>
                      </label>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">Nenhum produto encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3 - Commercial Rule */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Regra Comercial</h3>
              {(form.tipo === "preco_fixo") && (
                <div className="space-y-2">
                  <Label>Novo preço fixo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.preco_final_promocional || ""}
                    onChange={(e) => setForm((f) => ({ ...f, preco_final_promocional: Number(e.target.value) }))}
                  />
                </div>
              )}
              {(form.tipo === "desconto_percentual" || form.tipo === "por_categoria") && (
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.desconto_aplicado || ""}
                    onChange={(e) => setForm((f) => ({ ...f, desconto_aplicado: Number(e.target.value) }))}
                  />
                </div>
              )}
              {form.tipo === "desconto_valor_fixo" && (
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.desconto_aplicado || ""}
                    onChange={(e) => setForm((f) => ({ ...f, desconto_aplicado: Number(e.target.value) }))}
                  />
                </div>
              )}
              {form.tipo === "leve_mais_por_menos" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="2"
                      value={form.quantidade_leve}
                      onChange={(e) => setForm((f) => ({ ...f, quantidade_leve: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preço total (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.preco_final_promocional || ""}
                      onChange={(e) => setForm((f) => ({ ...f, preco_final_promocional: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}
              {form.tipo === "brinde" && (
                <div className="space-y-2">
                  <Label>Produto brinde</Label>
                  <Input
                    value={form.brinde_nome}
                    onChange={(e) => setForm((f) => ({ ...f, brinde_nome: e.target.value }))}
                    placeholder="Nome do produto brinde"
                  />
                </div>
              )}
              {form.tipo === "adicional_gratis" && (
                <div className="space-y-2">
                  <Label>Adicional brinde</Label>
                  <Input
                    value={form.adicional_nome}
                    onChange={(e) => setForm((f) => ({ ...f, adicional_nome: e.target.value }))}
                    placeholder="Ex: Borda recheada, Molho extra"
                  />
                </div>
              )}
            </div>

            {/* Section 4 - Auto calculations */}
            {calculations.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cálculo Automático</h3>
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader style={{ background: 'linear-gradient(135deg, hsl(var(--surface-table-header)), hsl(var(--surface-table-header-end)))' }}>
                      <TableRow>
                        <TableHead className="text-white font-bold">Produto</TableHead>
                        <TableHead className="text-white font-bold">Tam.</TableHead>
                        <TableHead className="text-right text-white font-bold">Custo</TableHead>
                        <TableHead className="text-right text-white font-bold">Original</TableHead>
                        <TableHead className="text-right text-white font-bold">Desconto</TableHead>
                        <TableHead className="text-right text-white font-bold">Final</TableHead>
                        <TableHead className="text-right text-white font-bold">Lucro R$</TableHead>
                        <TableHead className="text-right text-white font-bold">Lucro %</TableHead>
                        <TableHead className="text-center text-white font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculations.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.nome}</TableCell>
                          <TableCell>{c.tamanho ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(c.custo)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(c.precoVenda)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(c.desconto)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{fmt(c.precoFinal)}</TableCell>
                          <TableCell className={`text-right font-mono ${lucroColor(c.lucroPct)}`}>
                            {fmt(c.lucroRs)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${lucroColor(c.lucroPct)}`}>
                            {c.lucroPct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center">
                            {lucroEmoji(c.lucroPct)}
                            {c.lucroPct <= 0 && <AlertTriangle className="inline ml-1 h-3 w-3 text-destructive" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Section 5 - Period */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Período e Horário</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data início</Label>
                  <Input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data fim (opcional)</Label>
                  <Input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-3">
                  {DIAS.map((d) => (
                    <label key={d.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.dias_semana.includes(d.key)}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({
                            ...f,
                            dias_semana: checked
                              ? [...f.dias_semana, d.key]
                              : f.dias_semana.filter((x) => x !== d.key),
                          }))
                        }
                      />
                      <span className="text-sm">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Horário início (opcional)</Label>
                  <Input
                    type="time"
                    value={form.horario_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, horario_inicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário fim (opcional)</Label>
                  <Input
                    type="time"
                    value={form.horario_fim}
                    onChange={(e) => setForm((f) => ({ ...f, horario_fim: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Section 6 - Minimum margin */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Margem Mínima</h3>
              <div className="space-y-2">
                <Label>Margem mínima aceitável (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={form.margem_minima_aceitavel}
                  onChange={(e) => setForm((f) => ({ ...f, margem_minima_aceitavel: Number(e.target.value) }))}
                  className="max-w-[120px]"
                />
              </div>
              {calculations.some((c) => c.lucroPct < form.margem_minima_aceitavel) && (
                <div className="flex items-center gap-2 rounded-md bg-yellow-900/30 border border-yellow-800 px-4 py-3 text-sm text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Um ou mais produtos estão abaixo da margem mínima de {form.margem_minima_aceitavel}%
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Criar Promoção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
