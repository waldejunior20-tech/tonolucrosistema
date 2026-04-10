import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Pencil, Trash2, Plus, Filter, Search, X, Check } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { formatQty } from "@/components/MoneyInput";

const TIPOS = ["tradicional", "especial", "premium", "doce"];
const UNIDADES = ["kg", "g", "L", "ml", "unidade"];
const TIPOS_INSUMO = ["comprado", "produzido"];

type FichaTecnica = Tables<"fichas_tecnicas_pizza">;
type FichaIngrediente = Tables<"fichas_tecnicas_pizza_ingredientes">;
type InsumoComprado = Tables<"insumos_comprados">;
type InsumoProprio = Tables<"insumos_proprios">;

interface IngredienteForm {
  db_id?: string; // DB row ID for auto-save
  tipo_insumo: string;
  insumo_comprado_id: string;
  insumo_proprio_id: string;
  nome_display: string;
  qtd_p: number;
  qtd_m: number;
  qtd_g: number;
  unidade: string;
  caixa_p_id: string;
  caixa_p_nome: string;
  caixa_m_id: string;
  caixa_m_nome: string;
  caixa_g_id: string;
  caixa_g_nome: string;
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
  caixa_p_id: "",
  caixa_p_nome: "",
  caixa_m_id: "",
  caixa_m_nome: "",
  caixa_g_id: "",
  caixa_g_nome: "",
};

const converterQuantidade = (quantidade: number, unidade: string) => {
  if (unidade === "g" || unidade === "ml") return quantidade / 1000;
  return quantidade;
};

export default function FichasTecnicasPizza() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    const tipo = searchParams.get("tipo");
    if (tipo && TIPOS.includes(tipo)) {
      setFiltroTipo(tipo);
    } else {
      setFiltroTipo("todos");
    }
  }, [searchParams]);
  const [buscaIngrediente, setBuscaIngrediente] = useState("");
  const [buscaAberta, setBuscaAberta] = useState<number | null>(null);
  const [buscaEmbalagemAberta, setBuscaEmbalagemAberta] = useState<string | null>(null);
  const [buscaEmbalagemTermo, setBuscaEmbalagemTermo] = useState("");
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});

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
      if (ing.tipo_insumo === "embalagem_p") {
        custoP += (custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0) * Number(ing.qtd_p ?? 0);
      } else if (ing.tipo_insumo === "embalagem_m") {
        custoM += (custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0) * Number(ing.qtd_m ?? 0);
      } else if (ing.tipo_insumo === "embalagem_g") {
        custoG += (custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0) * Number(ing.qtd_g ?? 0);
      } else {
        custoP += calcularCustoIngrediente(ing, Number(ing.qtd_p ?? 0));
        custoM += calcularCustoIngrediente(ing, Number(ing.qtd_m ?? 0));
        custoG += calcularCustoIngrediente(ing, Number(ing.qtd_g ?? 0));
      }
    });
    return { custoP, custoM, custoG };
  };

  // Custos do formulário
  const calcularCustosForm = () => {
    let custoP = 0, custoM = 0, custoG = 0;
    form.ingredientes.forEach((ing) => {
      if (ing.tipo_insumo === "embalagem") {
        custoP += (custoCompradoMap.get(ing.caixa_p_id) ?? 0) * 1;
        custoM += (custoCompradoMap.get(ing.caixa_m_id) ?? 0) * 1;
        custoG += (custoCompradoMap.get(ing.caixa_g_id) ?? 0) * 1;
      } else {
        const id = ing.tipo_insumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
        if (!id) return;
        const custoUnit = ing.tipo_insumo === "comprado"
          ? (custoCompradoMap.get(id) ?? 0)
          : (custoProprioMap.get(id) ?? 0);
        custoP += custoUnit * converterQuantidade(ing.qtd_p, ing.unidade);
        custoM += custoUnit * converterQuantidade(ing.qtd_m, ing.unidade);
        custoG += custoUnit * converterQuantidade(ing.qtd_g, ing.unidade);
      }
    });
    return { custoP, custoM, custoG };
  };

  // Expande ingredientes do form para rows do DB
  const expandIngredientesParaDB = (ingredientes: IngredienteForm[], fichaId: string) => {
    const rows: Array<{ficha_id: string; tipo_insumo: string; insumo_comprado_id: string | null; insumo_proprio_id: string | null; qtd_p: number; qtd_m: number; qtd_g: number; unidade: string}> = [];
    ingredientes.forEach((ing) => {
      if (ing.tipo_insumo === "embalagem") {
        if (ing.caixa_p_id) rows.push({ ficha_id: fichaId, tipo_insumo: "embalagem_p", insumo_comprado_id: ing.caixa_p_id, insumo_proprio_id: null, qtd_p: 1, qtd_m: 0, qtd_g: 0, unidade: "unidade" });
        if (ing.caixa_m_id) rows.push({ ficha_id: fichaId, tipo_insumo: "embalagem_m", insumo_comprado_id: ing.caixa_m_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 1, qtd_g: 0, unidade: "unidade" });
        if (ing.caixa_g_id) rows.push({ ficha_id: fichaId, tipo_insumo: "embalagem_g", insumo_comprado_id: ing.caixa_g_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 0, qtd_g: 1, unidade: "unidade" });
      } else {
        rows.push({
          ficha_id: fichaId, tipo_insumo: ing.tipo_insumo,
          insumo_comprado_id: ing.insumo_comprado_id || null,
          insumo_proprio_id: ing.insumo_proprio_id || null,
          qtd_p: ing.qtd_p, qtd_m: ing.qtd_m, qtd_g: ing.qtd_g, unidade: ing.unidade,
        });
      }
    });
    return rows;
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

      const dbRows = expandIngredientesParaDB(data.ingredientes, inserted.id);
      if (dbRows.length > 0) {
        const { error: ingError } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .insert(dbRows);
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

      const dbRows = expandIngredientesParaDB(data.ingredientes, id);
      if (dbRows.length > 0) {
        const { error: ingError } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .insert(dbRows);
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
    setBuscaEmbalagemAberta(null);
    setBuscaEmbalagemTermo("");
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

    const allIngs = ings ?? [];
    const embalagemRows = allIngs.filter((i) => i.tipo_insumo.startsWith("embalagem_"));
    const normalRows = allIngs.filter((i) => !i.tipo_insumo.startsWith("embalagem_"));

    const ingredientesForm: IngredienteForm[] = normalRows.map((ing) => ({
      db_id: ing.id,
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
      caixa_p_id: "", caixa_p_nome: "", caixa_m_id: "", caixa_m_nome: "", caixa_g_id: "", caixa_g_nome: "",
    }));

    // Merge embalagem rows into single form entry
    if (embalagemRows.length > 0) {
      const embP = embalagemRows.find((r) => r.tipo_insumo === "embalagem_p");
      const embM = embalagemRows.find((r) => r.tipo_insumo === "embalagem_m");
      const embG = embalagemRows.find((r) => r.tipo_insumo === "embalagem_g");
      ingredientesForm.push({
        ...emptyIngrediente,
        tipo_insumo: "embalagem",
        caixa_p_id: embP?.insumo_comprado_id ?? "",
        caixa_p_nome: nomeCompradoMap.get(embP?.insumo_comprado_id ?? "") ?? "",
        caixa_m_id: embM?.insumo_comprado_id ?? "",
        caixa_m_nome: nomeCompradoMap.get(embM?.insumo_comprado_id ?? "") ?? "",
        caixa_g_id: embG?.insumo_comprado_id ?? "",
        caixa_g_nome: nomeCompradoMap.get(embG?.insumo_comprado_id ?? "") ?? "",
      });
    }

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

  // Auto-save ingredient quantity on blur (edit mode only)
  const autoSaveIngredienteQtd = useCallback(
    async (ing: IngredienteForm, field: "qtd_p" | "qtd_m" | "qtd_g", value: number) => {
      if (!editingId || !ing.db_id) return;
      try {
        const updateData: Record<string, number> = { [field]: value };
        const { error } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .update(updateData as any)
          .eq("id", ing.db_id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza_ingredientes"] });
        const key = `${ing.db_id}-${field}`;
        setSavedFields((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => setSavedFields((prev) => ({ ...prev, [key]: false })), 2000);
      } catch {
        // silent fail
      }
    },
    [editingId, queryClient]
  );

  const selectInsumo = (index: number, id: string, nome: string, tipo: string) => {
    const updated = [...form.ingredientes];
    let unidadeAuto = updated[index].unidade;
    if (tipo === "comprado") {
      const insumo = insumosComprados.find((ic) => ic.id === id);
      if (insumo) unidadeAuto = insumo.unidade === "kg" ? "g" : insumo.unidade === "L" ? "ml" : insumo.unidade;
      updated[index] = { ...updated[index], insumo_comprado_id: id, nome_display: nome, unidade: unidadeAuto };
    } else {
      const insumo = insumosProprios.find((ip) => ip.id === id);
      if (insumo) unidadeAuto = insumo.unidade_rendimento === "kg" ? "g" : insumo.unidade_rendimento === "L" ? "ml" : insumo.unidade_rendimento;
      updated[index] = { ...updated[index], insumo_proprio_id: id, nome_display: nome, unidade: unidadeAuto };
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

  const addEmbalagem = () => {
    const hasEmbalagem = form.ingredientes.some((i) => i.tipo_insumo === "embalagem");
    if (hasEmbalagem) { toast.error("Já existe uma embalagem nesta ficha."); return; }
    setForm({ ...form, ingredientes: [...form.ingredientes, { ...emptyIngrediente, tipo_insumo: "embalagem" }] });
  };

  const selectEmbalagemInsumo = (index: number, size: "p" | "m" | "g", id: string, nome: string) => {
    const updated = [...form.ingredientes];
    if (size === "p") updated[index] = { ...updated[index], caixa_p_id: id, caixa_p_nome: nome };
    else if (size === "m") updated[index] = { ...updated[index], caixa_m_id: id, caixa_m_nome: nome };
    else updated[index] = { ...updated[index], caixa_g_id: id, caixa_g_nome: nome };
    setForm({ ...form, ingredientes: updated });
    setBuscaEmbalagemAberta(null);
    setBuscaEmbalagemTermo("");
  };

  const filteredFichas = filtroTipo === "todos" ? fichas : fichas.filter((f) => f.tipo === filtroTipo);

  const getFilteredInsumos = (tipo: string) => {
    const term = buscaIngrediente.toLowerCase();
    if (tipo === "comprado") {
      return insumosComprados.filter((ic) => ic.nome.toLowerCase().includes(term)).slice(0, 10);
    }
    return insumosProprios.filter((ip) => ip.nome.toLowerCase().includes(term)).slice(0, 10);
  };

  const getFilteredEmbalagemInsumos = () => {
    const term = buscaEmbalagemTermo.toLowerCase();
    return insumosComprados.filter((ic) => ic.nome.toLowerCase().includes(term)).slice(0, 10);
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
                <Label className="text-base">Ingredientes</Label>

                {form.ingredientes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum ingrediente adicionado.</p>
                )}

                {form.ingredientes.map((ing, idx) => {
                  // Embalagem rendering
                  if (ing.tipo_insumo === "embalagem") {
                    const custoP = custoCompradoMap.get(ing.caixa_p_id) ?? 0;
                    const custoM = custoCompradoMap.get(ing.caixa_m_id) ?? 0;
                    const custoG = custoCompradoMap.get(ing.caixa_g_id) ?? 0;

                    const renderCaixaField = (size: "p" | "m" | "g", label: string, caixaId: string, caixaNome: string, custo: number) => {
                      const key = `${idx}-${size}`;
                      return (
                        <div key={size} className="flex items-center gap-2 flex-1">
                          <div className="flex-1 relative">
                            <Label className="text-xs">Caixa {label}</Label>
                            {caixaId ? (
                              <div className="flex items-center gap-1 h-8">
                                <span className="text-sm font-medium text-foreground truncate">{caixaNome}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => {
                                  const updated = [...form.ingredientes];
                                  if (size === "p") updated[idx] = { ...updated[idx], caixa_p_id: "", caixa_p_nome: "" };
                                  else if (size === "m") updated[idx] = { ...updated[idx], caixa_m_id: "", caixa_m_nome: "" };
                                  else updated[idx] = { ...updated[idx], caixa_g_id: "", caixa_g_nome: "" };
                                  setForm({ ...form, ingredientes: updated });
                                }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                  <Input
                                    placeholder="Buscar caixa..."
                                    className="pl-7 h-8 text-sm"
                                    value={buscaEmbalagemAberta === key ? buscaEmbalagemTermo : ""}
                                    onFocus={() => { setBuscaEmbalagemAberta(key); setBuscaEmbalagemTermo(""); }}
                                    onChange={(e) => setBuscaEmbalagemTermo(e.target.value)}
                                  />
                                </div>
                                {buscaEmbalagemAberta === key && (
                                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                                    {getFilteredEmbalagemInsumos().length === 0 ? (
                                      <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                                    ) : (
                                      getFilteredEmbalagemInsumos().map((item) => (
                                        <button key={item.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                          onClick={() => selectEmbalagemInsumo(idx, size, item.id, item.nome)}>
                                          <span className="font-medium">{item.nome}</span>
                                          <span className="text-xs text-muted-foreground ml-2">R$ {fmt(custoCompradoMap.get(item.id) ?? 0)}/un</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-[70px] text-center">
                            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Custo {label}</p>
                            <p className="text-xs font-medium text-foreground">R$ {fmt(custo)}</p>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div key={idx} className="rounded-md border border-border p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">📦 Embalagem por tamanho</Label>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeIngrediente(idx)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {renderCaixaField("p", "P (25cm)", ing.caixa_p_id, ing.caixa_p_nome, custoP)}
                          {renderCaixaField("m", "M (30cm)", ing.caixa_m_id, ing.caixa_m_nome, custoM)}
                          {renderCaixaField("g", "G (35cm)", ing.caixa_g_id, ing.caixa_g_nome, custoG)}
                        </div>
                      </div>
                    );
                  }

                  // Normal ingredient rendering
                  const insumoId = ing.tipo_insumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
                  const custoUnit = ing.tipo_insumo === "comprado"
                    ? (custoCompradoMap.get(insumoId) ?? 0)
                    : (custoProprioMap.get(insumoId) ?? 0);

                  return (
                    <div key={idx} className="rounded-md border border-border p-3 space-y-2">
                      <div className="flex items-end gap-2">
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
                                      <button key={item.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                        onClick={() => selectInsumo(idx, item.id, item.nome, ing.tipo_insumo)}>
                                        <span className="font-medium">{item.nome}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="w-24">
                          <Label className="text-xs">Unidade</Label>
                          <Select value={ing.unidade} onValueChange={(v) => updateIngrediente(idx, "unidade", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Un" /></SelectTrigger>
                            <SelectContent>
                              {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeIngrediente(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="flex items-end gap-2 bg-muted/40 rounded px-2 py-1.5">
                        {[
                          { label: "P", qtdKey: "qtd_p" as const, qtdVal: ing.qtd_p },
                          { label: "M", qtdKey: "qtd_m" as const, qtdVal: ing.qtd_m },
                          { label: "G", qtdKey: "qtd_g" as const, qtdVal: ing.qtd_g },
                        ].map(({ label, qtdKey, qtdVal }) => (
                          <div key={label} className="flex items-end gap-1.5 flex-1">
                            <div className="flex-1 min-w-0 relative">
                              <Label className="text-xs">Qtd {label}</Label>
                              <Input
                                type="number" step="0.01" min="0" className="h-8 text-sm pr-6"
                                value={qtdVal || ""}
                                onChange={(e) => updateIngrediente(idx, qtdKey, parseFloat(e.target.value) || 0)}
                                onBlur={() => autoSaveIngredienteQtd(ing, qtdKey, ing[qtdKey])}
                                placeholder="0,000"
                              />
                              {ing.db_id && savedFields[`${ing.db_id}-${qtdKey}`] && (
                                <Check className="absolute right-1 top-[50%] h-3.5 w-3.5 text-success animate-in fade-in duration-200" />
                              )}
                            </div>
                            <div className="min-w-[70px] text-center pb-1">
                              <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Custo {label}</p>
                              <p className="text-xs font-medium text-foreground">
                                R$ {fmt(custoUnit * converterQuantidade(qtdVal, ing.unidade))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1 flex-1 bg-[hsl(4,70%,46%)] hover:bg-[hsl(4,70%,40%)] text-primary-foreground"
                    onClick={addIngrediente}
                  >
                    <Plus className="h-3 w-3" /> Adicionar Ingrediente
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={addEmbalagem}
                    disabled={form.ingredientes.some((i) => i.tipo_insumo === "embalagem")}
                  >
                    <Plus className="h-3 w-3" /> 📦 Embalagem por Tamanho
                  </Button>
                </div>

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
