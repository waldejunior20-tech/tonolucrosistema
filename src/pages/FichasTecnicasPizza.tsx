import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Pencil, Trash2, Plus, Filter, Search, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const TIPOS = ["tradicional", "especial", "premium", "doce"];
const UNIDADES = ["kg", "g", "L", "ml", "unidade"];
const TIPOS_INSUMO = ["comprado", "produzido"];

type FichaTecnica = Tables<"fichas_tecnicas_pizza">;
type FichaIngrediente = Tables<"fichas_tecnicas_pizza_ingredientes">;
type InsumoComprado = Tables<"insumos_comprados">;
type InsumoProprio = Tables<"insumos_proprios">;

interface IngredienteForm {
  tipo_insumo: string;
  insumo_comprado_id: string;
  insumo_proprio_id: string;
  nome_display: string;
  qtd_p: number;
  qtd_m: number;
  qtd_g: number;
  unidade: string;
}

interface FormState {
  nome: string;
  numero_ficha: string;
  tipo: string;
  modo_preparo: string;
  ingredientes: IngredienteForm[];
}

const emptyForm: FormState = {
  nome: "",
  numero_ficha: "",
  tipo: "",
  modo_preparo: "",
  ingredientes: [],
};

const emptyIngrediente: IngredienteForm = {
  tipo_insumo: "comprado",
  insumo_comprado_id: "",
  insumo_proprio_id: "",
  nome_display: "",
  qtd_p: 0,
  qtd_m: 0,
  qtd_g: 0,
  unidade: "",
};

const converterQuantidade = (quantidade: number, unidade: string) => {
  if (unidade === "g" || unidade === "ml") return quantidade / 1000;
  return quantidade;
};

export default function FichasTecnicasPizza() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [buscaIngrediente, setBuscaIngrediente] = useState("");
  const [buscaAberta, setBuscaAberta] = useState<number | null>(null);

  // Queries
  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ["fichas_tecnicas_pizza"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FichaTecnica[];
    },
  });

  const { data: todosIngredientes = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_pizza_ingredientes")
        .select("*");
      if (error) throw error;
      return data as FichaIngrediente[];
    },
  });

  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as InsumoComprado[];
    },
  });

  const { data: insumosProprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_proprios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as InsumoProprio[];
    },
  });

  const { data: ingredientesProprios = [] } = useQuery({
    queryKey: ["insumos_proprios_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_proprios_ingredientes")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Maps de custo
  const custoCompradoMap = new Map<string, number>();
  const nomeCompradoMap = new Map<string, string>();
  insumosComprados.forEach((ic) => {
    custoCompradoMap.set(ic.id, Number(ic.preco_pago) / Number(ic.quantidade));
    nomeCompradoMap.set(ic.id, ic.nome);
  });

  // Custo por unidade de rendimento dos insumos próprios
  const custoProprioMap = new Map<string, number>();
  const nomeProprioMap = new Map<string, string>();
  insumosProprios.forEach((ip) => {
    const ings = ingredientesProprios.filter((i) => i.insumo_proprio_id === ip.id);
    const custoTotal = ings.reduce((acc, ing) => {
      const custoUnit = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
      const qtd = converterQuantidade(Number(ing.quantidade), ing.unidade);
      return acc + custoUnit * qtd;
    }, 0);
    const custoPorUn = Number(ip.rendimento) > 0 ? custoTotal / Number(ip.rendimento) : 0;
    custoProprioMap.set(ip.id, custoPorUn);
    nomeProprioMap.set(ip.id, ip.nome);
  });

  // Custo de um ingrediente para uma quantidade
  const calcularCustoIngrediente = (ing: IngredienteForm | FichaIngrediente, qtd: number) => {
    const unidade = ing.unidade;
    const qtdConvertida = converterQuantidade(qtd, unidade);
    if (ing.tipo_insumo === "comprado") {
      const id = "insumo_comprado_id" in ing ? (ing.insumo_comprado_id ?? "") : "";
      return (custoCompradoMap.get(id) ?? 0) * qtdConvertida;
    } else {
      const id = "insumo_proprio_id" in ing ? (ing.insumo_proprio_id ?? "") : "";
      return (custoProprioMap.get(id) ?? 0) * qtdConvertida;
    }
  };

  // Calcula custos P/M/G de uma ficha
  const calcularCustosFicha = (fichaId: string) => {
    const ings = todosIngredientes.filter((i) => i.ficha_id === fichaId);
    let custoP = 0, custoM = 0, custoG = 0;
    ings.forEach((ing) => {
      custoP += calcularCustoIngrediente(ing, Number(ing.qtd_p ?? 0));
      custoM += calcularCustoIngrediente(ing, Number(ing.qtd_m ?? 0));
      custoG += calcularCustoIngrediente(ing, Number(ing.qtd_g ?? 0));
    });
    return { custoP, custoM, custoG };
  };

  // Custos do formulário
  const calcularCustosForm = () => {
    let custoP = 0, custoM = 0, custoG = 0;
    form.ingredientes.forEach((ing) => {
      const id = ing.tipo_insumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
      if (!id) return;
      const custoUnit = ing.tipo_insumo === "comprado"
        ? (custoCompradoMap.get(id) ?? 0)
        : (custoProprioMap.get(id) ?? 0);
      custoP += custoUnit * converterQuantidade(ing.qtd_p, ing.unidade);
      custoM += custoUnit * converterQuantidade(ing.qtd_m, ing.unidade);
      custoG += custoUnit * converterQuantidade(ing.qtd_g, ing.unidade);
    });
    return { custoP, custoM, custoG };
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
    queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza_ingredientes"] });
  };

  // Insert
  const insertMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const { data: inserted, error } = await supabase
        .from("fichas_tecnicas_pizza")
        .insert({
          nome: data.nome,
          numero_ficha: data.numero_ficha || null,
          tipo: data.tipo || null,
          modo_preparo: data.modo_preparo || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (data.ingredientes.length > 0) {
        const { error: ingError } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .insert(
            data.ingredientes.map((ing) => ({
              ficha_id: inserted.id,
              tipo_insumo: ing.tipo_insumo,
              insumo_comprado_id: ing.insumo_comprado_id || null,
              insumo_proprio_id: ing.insumo_proprio_id || null,
              qtd_p: ing.qtd_p,
              qtd_m: ing.qtd_m,
              qtd_g: ing.qtd_g,
              unidade: ing.unidade,
            }))
          );
        if (ingError) throw ingError;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Ficha técnica cadastrada!");
      resetForm();
    },
    onError: () => toast.error("Erro ao cadastrar ficha técnica."),
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: FormState & { id: string }) => {
      const { error } = await supabase
        .from("fichas_tecnicas_pizza")
        .update({
          nome: data.nome,
          numero_ficha: data.numero_ficha || null,
          tipo: data.tipo || null,
          modo_preparo: data.modo_preparo || null,
        })
        .eq("id", id);
      if (error) throw error;

      await supabase
        .from("fichas_tecnicas_pizza_ingredientes")
        .delete()
        .eq("ficha_id", id);

      if (data.ingredientes.length > 0) {
        const { error: ingError } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .insert(
            data.ingredientes.map((ing) => ({
              ficha_id: id,
              tipo_insumo: ing.tipo_insumo,
              insumo_comprado_id: ing.insumo_comprado_id || null,
              insumo_proprio_id: ing.insumo_proprio_id || null,
              qtd_p: ing.qtd_p,
              qtd_m: ing.qtd_m,
              qtd_g: ing.qtd_g,
              unidade: ing.unidade,
            }))
          );
        if (ingError) throw ingError;
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Ficha técnica atualizada!");
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar ficha técnica."),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("fichas_tecnicas_pizza_ingredientes").delete().eq("ficha_id", id);
      const { error } = await supabase.from("fichas_tecnicas_pizza").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Ficha técnica excluída!");
    },
    onError: () => toast.error("Erro ao excluir ficha técnica."),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    setBuscaIngrediente("");
    setBuscaAberta(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) {
      toast.error("Preencha o nome da pizza.");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ ...form, id: editingId });
    } else {
      insertMutation.mutate(form);
    }
  };

  const handleEdit = async (ficha: FichaTecnica) => {
    const { data: ings } = await supabase
      .from("fichas_tecnicas_pizza_ingredientes")
      .select("*")
      .eq("ficha_id", ficha.id);

    const ingredientesForm: IngredienteForm[] = (ings ?? []).map((ing) => ({
      tipo_insumo: ing.tipo_insumo,
      insumo_comprado_id: ing.insumo_comprado_id ?? "",
      insumo_proprio_id: ing.insumo_proprio_id ?? "",
      nome_display:
        ing.tipo_insumo === "comprado"
          ? nomeCompradoMap.get(ing.insumo_comprado_id ?? "") ?? ""
          : nomeProprioMap.get(ing.insumo_proprio_id ?? "") ?? "",
      qtd_p: Number(ing.qtd_p ?? 0),
      qtd_m: Number(ing.qtd_m ?? 0),
      qtd_g: Number(ing.qtd_g ?? 0),
      unidade: ing.unidade,
    }));

    setForm({
      nome: ficha.nome,
      numero_ficha: ficha.numero_ficha ?? "",
      tipo: ficha.tipo ?? "",
      modo_preparo: ficha.modo_preparo ?? "",
      ingredientes: ingredientesForm,
    });
    setEditingId(ficha.id);
    setDialogOpen(true);
  };

  const addIngrediente = () => {
    setForm({ ...form, ingredientes: [...form.ingredientes, { ...emptyIngrediente }] });
  };

  const removeIngrediente = (index: number) => {
    setForm({ ...form, ingredientes: form.ingredientes.filter((_, i) => i !== index) });
  };

  const updateIngrediente = (index: number, field: keyof IngredienteForm, value: string | number) => {
    const updated = [...form.ingredientes];
    // Reset IDs when changing tipo_insumo
    if (field === "tipo_insumo") {
      updated[index] = {
        ...updated[index],
        tipo_insumo: value as string,
        insumo_comprado_id: "",
        insumo_proprio_id: "",
        nome_display: "",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setForm({ ...form, ingredientes: updated });
  };

  const selectInsumo = (index: number, id: string, nome: string, tipo: string) => {
    const updated = [...form.ingredientes];
    if (tipo === "comprado") {
      updated[index] = { ...updated[index], insumo_comprado_id: id, nome_display: nome };
    } else {
      updated[index] = { ...updated[index], insumo_proprio_id: id, nome_display: nome };
    }
    setForm({ ...form, ingredientes: updated });
    setBuscaIngrediente("");
    setBuscaAberta(null);
  };

  const clearInsumoSelection = (index: number) => {
    const updated = [...form.ingredientes];
    updated[index] = { ...updated[index], insumo_comprado_id: "", insumo_proprio_id: "", nome_display: "" };
    setForm({ ...form, ingredientes: updated });
  };

  const filteredFichas = filtroTipo === "todos" ? fichas : fichas.filter((f) => f.tipo === filtroTipo);

  const getFilteredInsumos = (tipo: string) => {
    const term = buscaIngrediente.toLowerCase();
    if (tipo === "comprado") {
      return insumosComprados.filter((ic) => ic.nome.toLowerCase().includes(term)).slice(0, 10);
    }
    return insumosProprios.filter((ip) => ip.nome.toLowerCase().includes(term)).slice(0, 10);
  };

  const custoForm = calcularCustosForm();
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasInsumoSelected = (ing: IngredienteForm) =>
    ing.tipo_insumo === "comprado" ? !!ing.insumo_comprado_id : !!ing.insumo_proprio_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fichas Técnicas de Pizza</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova Ficha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Dados principais */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="nome">Nome da Pizza *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Margherita, Calabresa"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="numero_ficha">Nº da Ficha</Label>
                  <Input
                    id="numero_ficha"
                    placeholder="Ex: FT-001"
                    value={form.numero_ficha}
                    onChange={(e) => setForm({ ...form, numero_ficha: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Custo P</p>
                      <p className="text-sm font-semibold text-foreground">R$ {fmt(custoForm.custoP)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Custo M</p>
                      <p className="text-sm font-semibold text-foreground">R$ {fmt(custoForm.custoM)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Custo G</p>
                      <p className="text-sm font-semibold text-foreground">R$ {fmt(custoForm.custoG)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="modo_preparo">Modo de Preparo</Label>
                <Textarea
                  id="modo_preparo"
                  placeholder="Descreva o passo a passo do preparo..."
                  value={form.modo_preparo}
                  onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Ingredientes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Ingredientes</Label>
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addIngrediente}>
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>

                {form.ingredientes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum ingrediente adicionado.</p>
                )}

                {form.ingredientes.map((ing, idx) => {
                  const insumoId = ing.tipo_insumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
                  const custoUnit = ing.tipo_insumo === "comprado"
                    ? (custoCompradoMap.get(insumoId) ?? 0)
                    : (custoProprioMap.get(insumoId) ?? 0);

                  return (
                    <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-end gap-2">
                        {/* Tipo insumo */}
                        <div className="w-36">
                          <Label className="text-xs">Tipo</Label>
                          <Select value={ing.tipo_insumo} onValueChange={(v) => updateIngrediente(idx, "tipo_insumo", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="comprado">Comprado</SelectItem>
                              <SelectItem value="produzido">Produzido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Busca insumo */}
                        <div className="flex-1 relative">
                          <Label className="text-xs">
                            {ing.tipo_insumo === "comprado" ? "Insumo Comprado" : "Insumo Produzido"}
                          </Label>
                          {hasInsumoSelected(ing) ? (
                            <div className="flex items-center gap-2 h-8">
                              <span className="text-sm font-medium text-foreground">{ing.nome_display}</span>
                              <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => clearInsumoSelection(idx)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                  placeholder="Buscar..."
                                  className="pl-7 h-8 text-sm"
                                  value={buscaAberta === idx ? buscaIngrediente : ""}
                                  onFocus={() => { setBuscaAberta(idx); setBuscaIngrediente(""); }}
                                  onChange={(e) => setBuscaIngrediente(e.target.value)}
                                />
                              </div>
                              {buscaAberta === idx && (
                                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                                  {getFilteredInsumos(ing.tipo_insumo).length === 0 ? (
                                    <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                                  ) : (
                                    getFilteredInsumos(ing.tipo_insumo).map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                        onClick={() => selectInsumo(idx, item.id, item.nome, ing.tipo_insumo)}
                                      >
                                        <span className="font-medium">{item.nome}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Unidade */}
                        <div className="w-24">
                          <Label className="text-xs">Unidade</Label>
                          <Select value={ing.unidade} onValueChange={(v) => updateIngrediente(idx, "unidade", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Un" /></SelectTrigger>
                            <SelectContent>
                              {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Remover */}
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeIngrediente(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {/* Quantidades P/M/G */}
                      <div className="grid grid-cols-6 gap-2">
                        <div>
                          <Label className="text-xs">Qtd P</Label>
                          <Input
                            type="number" step="0.01" min="0" className="h-8 text-sm"
                            value={ing.qtd_p || ""}
                            onChange={(e) => updateIngrediente(idx, "qtd_p", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Custo P</Label>
                          <p className="h-8 flex items-center text-xs text-muted-foreground">
                            R$ {fmt(custoUnit * converterQuantidade(ing.qtd_p, ing.unidade))}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Qtd M</Label>
                          <Input
                            type="number" step="0.01" min="0" className="h-8 text-sm"
                            value={ing.qtd_m || ""}
                            onChange={(e) => updateIngrediente(idx, "qtd_m", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Custo M</Label>
                          <p className="h-8 flex items-center text-xs text-muted-foreground">
                            R$ {fmt(custoUnit * converterQuantidade(ing.qtd_m, ing.unidade))}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Qtd G</Label>
                          <Input
                            type="number" step="0.01" min="0" className="h-8 text-sm"
                            value={ing.qtd_g || ""}
                            onChange={(e) => updateIngrediente(idx, "qtd_g", parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Custo G</Label>
                          <p className="h-8 flex items-center text-xs text-muted-foreground">
                            R$ {fmt(custoUnit * converterQuantidade(ing.qtd_g, ing.unidade))}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {form.ingredientes.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 text-right text-sm text-muted-foreground border-t border-border pt-2">
                    <p>Total P: R$ {fmt(custoForm.custoP)}</p>
                    <p>Total M: R$ {fmt(custoForm.custoM)}</p>
                    <p>Total G: R$ {fmt(custoForm.custoG)}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={insertMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredFichas.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma ficha técnica encontrada.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Custo P</TableHead>
                <TableHead className="text-right">Custo M</TableHead>
                <TableHead className="text-right">Custo G</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFichas.map((ficha) => {
                const custos = calcularCustosFicha(ficha.id);
                return (
                  <TableRow key={ficha.id}>
                    <TableCell className="font-medium">{ficha.nome}</TableCell>
                    <TableCell className="capitalize">{ficha.tipo ?? "—"}</TableCell>
                    <TableCell className="text-right">R$ {fmt(custos.custoP)}</TableCell>
                    <TableCell className="text-right">R$ {fmt(custos.custoM)}</TableCell>
                    <TableCell className="text-right">R$ {fmt(custos.custoG)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ficha)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ficha.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
