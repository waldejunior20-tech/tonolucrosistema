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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Pencil, Trash2, Plus, Filter, Search, X, Check, Pizza, AlertTriangle, Package, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { fieldErrorClass, FieldError } from "@/components/FormFieldError";
import type { Tables } from "@/integrations/supabase/types";
import { formatQty } from "@/components/MoneyInput";
import { matchesSearch } from "@/lib/utils";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { BaseSelector } from "@/components/fichas/BaseSelector";
import { SalvarComoBaseDialog } from "@/components/fichas/SalvarComoBaseDialog";
import type { BaseIngredienteInput } from "@/hooks/useBasesFicha";

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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [salvarBaseOpen, setSalvarBaseOpen] = useState(false);
  const [baseOrigemId, setBaseOrigemId] = useState<string | null>(null);
  const [ingredientesBaseIds, setIngredientesBaseIds] = useState<Set<string>>(new Set());

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
    const unidade_id = requireActiveUnidadeId();
    const rows: Array<{ficha_id: string; tipo_insumo: string; insumo_comprado_id: string | null; insumo_proprio_id: string | null; qtd_p: number; qtd_m: number; qtd_g: number; unidade: string; unidade_id: string}> = [];
    ingredientes.forEach((ing) => {
      if (ing.tipo_insumo === "embalagem") {
        if (ing.caixa_p_id) rows.push({ ficha_id: fichaId, tipo_insumo: "embalagem_p", insumo_comprado_id: ing.caixa_p_id, insumo_proprio_id: null, qtd_p: 1, qtd_m: 0, qtd_g: 0, unidade: "unidade", unidade_id });
        if (ing.caixa_m_id) rows.push({ ficha_id: fichaId, tipo_insumo: "embalagem_m", insumo_comprado_id: ing.caixa_m_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 1, qtd_g: 0, unidade: "unidade", unidade_id });
        if (ing.caixa_g_id) rows.push({ ficha_id: fichaId, tipo_insumo: "embalagem_g", insumo_comprado_id: ing.caixa_g_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 0, qtd_g: 1, unidade: "unidade", unidade_id });
      } else {
        rows.push({
          ficha_id: fichaId, tipo_insumo: ing.tipo_insumo,
          insumo_comprado_id: ing.insumo_comprado_id || null,
          insumo_proprio_id: ing.insumo_proprio_id || null,
          qtd_p: ing.qtd_p, qtd_m: ing.qtd_m, qtd_g: ing.qtd_g, unidade: ing.unidade,
          unidade_id,
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
    onError: (e) => appError("ERR-FTP-001", e),
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
    onError: (e) => appError("ERR-FTP-002", e),
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
    onError: (e) => appError("ERR-FTP-003", e),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    setBuscaIngrediente("");
    setBuscaAberta(null);
    setBuscaEmbalagemAberta(null);
    setBuscaEmbalagemTermo("");
    setTouched({});
    setBaseOrigemId(null);
    setIngredientesBaseIds(new Set());
  };

  // Validation
  const nomeInvalid = touched.nome && !form.nome.trim();
  const nomeValid = form.nome.trim().length > 0;
  const ingredientesInvalid = touched.ingredientes && form.ingredientes.length === 0;
  const hasNormalIngredients = form.ingredientes.some(i => i.tipo_insumo !== "embalagem");
  const formIsValid = !!form.nome.trim() && hasNormalIngredients;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, ingredientes: true });
    if (!formIsValid) {
      appError("ERR-FTP-004");
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
    setBaseOrigemId(ficha.base_origem_id ?? null);
    // Se a ficha veio de uma base, marca todos os ingredientes atualmente persistidos como vindos da base.
    // Novos ingredientes adicionados depois (sem db_id) ficam como "único".
    if (ficha.base_origem_id) {
      setIngredientesBaseIds(new Set(ingredientesForm.map((i) => i.db_id).filter((x): x is string => !!x)));
    } else {
      setIngredientesBaseIds(new Set());
    }
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
    if (tipo === "comprado") {
      return insumosComprados.filter((ic) => matchesSearch(ic.nome, buscaIngrediente)).slice(0, 10);
    }
    return insumosProprios.filter((ip) => matchesSearch(ip.nome, buscaIngrediente)).slice(0, 10);
  };

  const getFilteredEmbalagemInsumos = () => {
    return insumosComprados.filter((ic) => matchesSearch(ic.nome, buscaEmbalagemTermo)).slice(0, 10);
  };

  const custoForm = calcularCustosForm();
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasInsumoSelected = (ing: IngredienteForm) =>
    ing.tipo_insumo === "comprado" ? !!ing.insumo_comprado_id : !!ing.insumo_proprio_id;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <PageHeader title="Fichas Técnicas de Pizza" description="Gerencie suas receitas de pizza com custos por tamanho.">
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="btn-action-add gap-2">
              <Plus className="h-4 w-4" /> Nova Ficha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-5xl max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
              <DialogTitle className="text-xl">{editingId ? "Editar Ficha Técnica" : "Nova Ficha Técnica"}</DialogTitle>
            </DialogHeader>

            {/* STICKY COST-STRIP */}
            <div className="px-6 py-3 bg-muted/30 border-b border-border shrink-0">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Custo P", value: custoForm.custoP, sub: "25cm" },
                  { label: "Custo M", value: custoForm.custoM, sub: "30cm" },
                  { label: "Custo G", value: custoForm.custoG, sub: "35cm" },
                ].map((c) => (
                  <div key={c.label} className="rounded-md bg-card border border-border px-3 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground">{c.sub}</p>
                    </div>
                    <p className="text-lg font-bold text-money tabular-nums">R$ {fmt(c.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {editingId && (
                  <BaseSelector
                    tipoFicha="pizza"
                    fichaId={editingId}
                    baseAplicadaId={baseOrigemId}
                    onBaseAplicada={async (baseId) => {
                      const ficha = fichas.find((f) => f.id === editingId);
                      if (ficha) {
                        await queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza_ingredientes"] });
                        await queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
                        // Persistir a origem da base na ficha
                        await supabase.from("fichas_tecnicas_pizza").update({ base_origem_id: baseId }).eq("id", ficha.id);
                        handleEdit({ ...ficha, base_origem_id: baseId });
                      }
                    }}
                    onCriarNovaBase={() => setSalvarBaseOpen(true)}
                  />
                )}

                {/* Dados principais */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nome">Nome da Pizza *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Margherita, Calabresa"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      onBlur={() => setTouched(t => ({ ...t, nome: true }))}
                      className={fieldErrorClass(nomeInvalid)}
                    />
                    <FieldError show={nomeInvalid} />
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
                  <div className="col-span-3">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger className="w-[260px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {TIPOS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* INGREDIENTES — TABELA DENSA */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Ingredientes *</Label>
                    <Button type="button" size="sm" className="btn-action-add gap-1" onClick={addIngrediente}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar Ingrediente
                    </Button>
                  </div>

                  {(() => {
                    const normais = form.ingredientes
                      .map((ing, idx) => ({ ing, idx }))
                      .filter(({ ing }) => ing.tipo_insumo !== "embalagem");

                    if (normais.length === 0) {
                      return (
                        <div className={cn(
                          "rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground",
                          ingredientesInvalid && "border-destructive/50 bg-destructive/5",
                        )}>
                          Nenhum ingrediente adicionado. Aplique uma base ou clique em "Adicionar Ingrediente".
                          {ingredientesInvalid && <p className="text-[11px] text-destructive mt-1 font-medium">Adicione pelo menos um ingrediente</p>}
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-md border border-border overflow-visible">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[280px]">Ingrediente</TableHead>
                              <TableHead className="w-[90px]">Origem</TableHead>
                              <TableHead className="w-[100px]">Unidade</TableHead>
                              <TableHead className="w-[88px] text-right">Qtd P</TableHead>
                              <TableHead className="w-[88px] text-right">Qtd M</TableHead>
                              <TableHead className="w-[88px] text-right">Qtd G</TableHead>
                              <TableHead className="w-[80px] text-right">Custo P</TableHead>
                              <TableHead className="w-[80px] text-right">Custo M</TableHead>
                              <TableHead className="w-[80px] text-right">Custo G</TableHead>
                              <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {normais.map(({ ing, idx }) => {
                              const insumoId = ing.tipo_insumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
                              const custoUnit = ing.tipo_insumo === "comprado"
                                ? (custoCompradoMap.get(insumoId) ?? 0)
                                : (custoProprioMap.get(insumoId) ?? 0);
                              const fromBase = !!ing.db_id && ingredientesBaseIds.has(ing.db_id);

                              // Validação: unidade do insumo comprado vs unidade usada
                              const insumoCompradoSel = insumosComprados.find((i) => i.id === ing.insumo_comprado_id);
                              const familiaCompra = insumoCompradoSel
                                ? (["kg", "g"].includes(insumoCompradoSel.unidade) ? "peso"
                                  : ["L", "ml"].includes(insumoCompradoSel.unidade) ? "volume" : "un")
                                : null;
                              const familiaUso = ["kg", "g"].includes(ing.unidade) ? "peso"
                                : ["L", "ml"].includes(ing.unidade) ? "volume" : "un";
                              const mismatchUnidade = ing.tipo_insumo === "comprado" && familiaCompra && ing.unidade && familiaCompra !== familiaUso;

                              const renderQtdInput = (qtdKey: "qtd_p" | "qtd_m" | "qtd_g", qtdVal: number) => {
                                const invalid = qtdVal < 0 || qtdVal > 999;
                                return (
                                  <Input
                                    type="number" step="0.01" min="0"
                                    className={cn(
                                      "h-9 text-sm text-right tabular-nums px-2",
                                      invalid && "border-destructive focus-visible:border-destructive",
                                    )}
                                    value={qtdVal || ""}
                                    onChange={(e) => updateIngrediente(idx, qtdKey, parseFloat(e.target.value) || 0)}
                                    onBlur={() => autoSaveIngredienteQtd(ing, qtdKey, ing[qtdKey])}
                                    placeholder="0"
                                  />
                                );
                              };

                              return (
                                <TableRow
                                  key={idx}
                                  className={cn(
                                    "group",
                                    fromBase && "border-l-2 border-l-success",
                                  )}
                                >
                                  {/* Ingrediente: nome + tipo + busca */}
                                  <TableCell className="align-top py-2 overflow-visible relative">
                                    <div className="flex items-center gap-2">
                                      <Select value={ing.tipo_insumo} onValueChange={(v) => updateIngrediente(idx, "tipo_insumo", v)}>
                                        <SelectTrigger className="h-9 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="comprado">Comprado</SelectItem>
                                          <SelectItem value="produzido">Produzido</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="flex-1 relative">
                                        {hasInsumoSelected(ing) ? (
                                          <div className="flex items-center gap-1 h-9">
                                            <span className="text-sm font-medium text-foreground truncate" title={ing.nome_display}>{ing.nome_display}</span>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => clearInsumoSelection(idx)}>
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Popover open={buscaAberta === idx} onOpenChange={(o) => { if (!o) setBuscaAberta(null); }}>
                                            <PopoverTrigger asChild>
                                              <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                                <Input
                                                  placeholder="Buscar..."
                                                  className="pl-7 h-9 text-sm"
                                                  value={buscaAberta === idx ? buscaIngrediente : ""}
                                                  onFocus={() => { setBuscaAberta(idx); setBuscaIngrediente(""); }}
                                                  onChange={(e) => setBuscaIngrediente(e.target.value)}
                                                />
                                              </div>
                                            </PopoverTrigger>
                                            <PopoverContent
                                              align="start"
                                              sideOffset={4}
                                              onOpenAutoFocus={(e) => e.preventDefault()}
                                              className="p-0 w-[var(--radix-popover-trigger-width)] max-h-56 overflow-y-auto"
                                            >
                                              {getFilteredInsumos(ing.tipo_insumo).length === 0 ? (
                                                <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                                              ) : (
                                                getFilteredInsumos(ing.tipo_insumo).map((item) => (
                                                  <button key={item.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                    onMouseDown={(e) => { e.preventDefault(); selectInsumo(idx, item.id, item.nome, ing.tipo_insumo); }}>
                                                    <span className="font-medium">{item.nome}</span>
                                                  </button>
                                                ))
                                              )}
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                    </div>
                                    {mismatchUnidade && (
                                      <p className="flex items-center gap-1 text-[10px] text-warning mt-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Comprado em <strong>{insumoCompradoSel?.unidade}</strong>, usando em <strong>{ing.unidade}</strong>
                                      </p>
                                    )}
                                  </TableCell>

                                  {/* Origem */}
                                  <TableCell className="align-middle py-2">
                                    {fromBase ? (
                                      <Badge variant="secondary" className="bg-success/15 text-success border-success/30 text-[10px] uppercase tracking-wide">
                                        <Sparkles className="h-2.5 w-2.5 mr-0.5" /> base
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-warning/40 text-warning">
                                        único
                                      </Badge>
                                    )}
                                  </TableCell>

                                  {/* Unidade */}
                                  <TableCell className="align-middle py-2">
                                    <Select value={ing.unidade} onValueChange={(v) => updateIngrediente(idx, "unidade", v)}>
                                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Un" /></SelectTrigger>
                                      <SelectContent>
                                        {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  {/* Quantidades */}
                                  <TableCell className="align-middle py-2">{renderQtdInput("qtd_p", ing.qtd_p)}</TableCell>
                                  <TableCell className="align-middle py-2">{renderQtdInput("qtd_m", ing.qtd_m)}</TableCell>
                                  <TableCell className="align-middle py-2">{renderQtdInput("qtd_g", ing.qtd_g)}</TableCell>

                                  {/* Custos */}
                                  <TableCell className="text-right text-xs font-medium tabular-nums align-middle py-2">
                                    R$ {fmt(custoUnit * converterQuantidade(ing.qtd_p, ing.unidade))}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-medium tabular-nums align-middle py-2">
                                    R$ {fmt(custoUnit * converterQuantidade(ing.qtd_m, ing.unidade))}
                                  </TableCell>
                                  <TableCell className="text-right text-xs font-medium tabular-nums align-middle py-2">
                                    R$ {fmt(custoUnit * converterQuantidade(ing.qtd_g, ing.unidade))}
                                  </TableCell>

                                  <TableCell className="align-middle py-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                      onClick={() => removeIngrediente(idx)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>

                {/* SEÇÃO EMBALAGENS */}
                {(() => {
                  const embIdx = form.ingredientes.findIndex((i) => i.tipo_insumo === "embalagem");
                  const ing = embIdx >= 0 ? form.ingredientes[embIdx] : null;

                  if (!ing) {
                    return (
                      <div className="rounded-md border border-dashed border-border p-4 flex items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span>Sem embalagens cadastradas — recomendado para CMV correto.</span>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={addEmbalagem} className="gap-1">
                          <Plus className="h-3.5 w-3.5" /> Adicionar Embalagens
                        </Button>
                      </div>
                    );
                  }

                  // Helpers para extras (ketchup, maionese, mesinha) — buscam o insumo comprado por nome
                  const isPizzaDoce = form.tipo === "doce";
                  const findInsumoByName = (terms: string[]) =>
                    insumosComprados.find((ic) =>
                      terms.some((t) => ic.nome.toLowerCase().includes(t)),
                    );
                  const hasExtra = (terms: string[]) => {
                    const insumo = findInsumoByName(terms);
                    if (!insumo) return false;
                    return form.ingredientes.some(
                      (i) => i.tipo_insumo === "comprado" && i.insumo_comprado_id === insumo.id,
                    );
                  };
                  const toggleExtra = (terms: string[], label: string) => {
                    const insumo = findInsumoByName(terms);
                    if (!insumo) {
                      toast.error(`Cadastre "${label}" em Insumos Comprados primeiro.`);
                      return;
                    }
                    const existing = form.ingredientes.findIndex(
                      (i) => i.tipo_insumo === "comprado" && i.insumo_comprado_id === insumo.id,
                    );
                    if (existing >= 0) {
                      const updated = [...form.ingredientes];
                      updated.splice(existing, 1);
                      setForm({ ...form, ingredientes: updated });
                    } else {
                      setForm({
                        ...form,
                        ingredientes: [
                          ...form.ingredientes,
                          {
                            ...emptyIngrediente,
                            tipo_insumo: "comprado",
                            insumo_comprado_id: insumo.id,
                            nome_display: insumo.nome,
                            unidade: insumo.unidade,
                            qtd_p: 1,
                            qtd_m: 1,
                            qtd_g: 1,
                          },
                        ],
                      });
                    }
                  };

                  const ketchupTerms = ["ketchup", "catchup"];
                  const maioneseTerms = ["maionese"];
                  const mesinhaTerms = ["mesinha"];
                  const ketchupOn = hasExtra(ketchupTerms);
                  const maioneseOn = hasExtra(maioneseTerms);
                  const mesinhaOn = hasExtra(mesinhaTerms);

                  const faltando = !ing.caixa_p_id || !ing.caixa_m_id || !ing.caixa_g_id;

                  const renderCaixaSlot = (size: "p" | "m" | "g", label: string, dim: string, caixaId: string, caixaNome: string) => {
                    const key = `${embIdx}-${size}`;
                    const custo = custoCompradoMap.get(caixaId) ?? 0;
                    return (
                      <div className="rounded-md border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold">Caixa {label}</p>
                            <p className="text-[10px] text-muted-foreground">{dim}</p>
                          </div>
                          {caixaId && (
                            <p className="text-xs font-semibold text-money tabular-nums">R$ {fmt(custo)}</p>
                          )}
                        </div>
                        {caixaId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-foreground truncate flex-1" title={caixaNome}>{caixaNome}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              const updated = [...form.ingredientes];
                              if (size === "p") updated[embIdx] = { ...updated[embIdx], caixa_p_id: "", caixa_p_nome: "" };
                              else if (size === "m") updated[embIdx] = { ...updated[embIdx], caixa_m_id: "", caixa_m_nome: "" };
                              else updated[embIdx] = { ...updated[embIdx], caixa_g_id: "", caixa_g_nome: "" };
                              setForm({ ...form, ingredientes: updated });
                            }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Popover open={buscaEmbalagemAberta === key} onOpenChange={(o) => { if (!o) setBuscaEmbalagemAberta(null); }}>
                            <PopoverTrigger asChild>
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                                <Input
                                  placeholder="Buscar caixa..."
                                  className="pl-7 h-8 text-sm"
                                  value={buscaEmbalagemAberta === key ? buscaEmbalagemTermo : ""}
                                  onFocus={() => { setBuscaEmbalagemAberta(key); setBuscaEmbalagemTermo(""); }}
                                  onChange={(e) => setBuscaEmbalagemTermo(e.target.value)}
                                />
                              </div>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              sideOffset={4}
                              onOpenAutoFocus={(e) => e.preventDefault()}
                              className="p-0 w-[var(--radix-popover-trigger-width)] max-h-56 overflow-y-auto"
                            >
                              {getFilteredEmbalagemInsumos().length === 0 ? (
                                <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                              ) : (
                                getFilteredEmbalagemInsumos().map((item) => (
                                  <button key={item.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                    onMouseDown={(e) => { e.preventDefault(); selectEmbalagemInsumo(embIdx, size, item.id, item.nome); }}>
                                    <span className="font-medium">{item.nome}</span>
                                    <span className="text-xs text-muted-foreground ml-2">R$ {fmt(custoCompradoMap.get(item.id) ?? 0)}/un</span>
                                  </button>
                                ))
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-foreground" />
                          <Label className="text-base">Embalagens por Tamanho</Label>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeIngrediente(embIdx)}>
                          <Trash2 className="h-3.5 w-3.5" /> Remover
                        </Button>
                      </div>

                      {faltando && (
                        <div className="flex items-center gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Faltam embalagens — selecione caixa para cada tamanho usado.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3">
                        {renderCaixaSlot("p", "P", "25cm", ing.caixa_p_id, ing.caixa_p_nome)}
                        {renderCaixaSlot("m", "M", "30cm", ing.caixa_m_id, ing.caixa_m_nome)}
                        {renderCaixaSlot("g", "G", "35cm", ing.caixa_g_id, ing.caixa_g_nome)}
                      </div>

                      {/* EXTRAS DE EMBALAGEM — ketchup/maionese (só salgadas) e mesinha (todas) */}
                      <div className="rounded-md border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <p className="text-sm font-bold">Extras</p>
                          <p className="text-[10px] text-muted-foreground">
                            Mesinha vai em todas. Ketchup e Maionese só nas salgadas.
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "🍅 Ketchup", on: ketchupOn, terms: ketchupTerms, allowed: !isPizzaDoce, hint: isPizzaDoce ? "Só pizzas salgadas" : null },
                            { label: "🥚 Maionese", on: maioneseOn, terms: maioneseTerms, allowed: !isPizzaDoce, hint: isPizzaDoce ? "Só pizzas salgadas" : null },
                            { label: "🪑 Mesinha", on: mesinhaOn, terms: mesinhaTerms, allowed: true, hint: null },
                          ].map((x) => (
                            <button
                              key={x.label}
                              type="button"
                              disabled={!x.allowed && !x.on}
                              onClick={() => toggleExtra(x.terms, x.label)}
                              className={cn(
                                "rounded-md border px-3 py-2 text-xs text-left transition",
                                x.on
                                  ? "bg-foreground text-background border-foreground"
                                  : x.allowed
                                    ? "bg-muted/30 border-border hover:border-primary hover:text-primary"
                                    : "bg-muted/10 border-border text-muted-foreground/50 cursor-not-allowed",
                              )}
                              title={x.hint ?? ""}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-medium">{x.label}</span>
                                {x.on && <Check className="h-3 w-3" />}
                              </div>
                              {x.hint && <p className="text-[10px] mt-0.5 opacity-70">{x.hint}</p>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* MODO DE PREPARO */}
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
              </div>

              {/* STICKY FOOTER */}
              <div className="border-t border-border bg-card/95 backdrop-blur px-6 py-3 shrink-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total P</span>
                      <p className="font-bold text-money tabular-nums">R$ {fmt(custoForm.custoP)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total M</span>
                      <p className="font-bold text-money tabular-nums">R$ {fmt(custoForm.custoM)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total G</span>
                      <p className="font-bold text-money tabular-nums">R$ {fmt(custoForm.custoG)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {form.ingredientes.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSalvarBaseOpen(true)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Salvar como base
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                    <Button type="submit" disabled={insertMutation.isPending || updateMutation.isPending || (!editingId && !formIsValid)} className={!editingId && !formIsValid ? "opacity-50" : ""}>
                      {editingId ? "Salvar" : "Cadastrar"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            <SalvarComoBaseDialog
              open={salvarBaseOpen}
              onOpenChange={setSalvarBaseOpen}
              tipoFicha="pizza"
              ingredientes={form.ingredientes.flatMap<BaseIngredienteInput>((ing) => {
                if (ing.tipo_insumo === "embalagem") {
                  const rows: BaseIngredienteInput[] = [];
                  if (ing.caixa_p_id) rows.push({ tipo_insumo: "embalagem_p", insumo_comprado_id: ing.caixa_p_id, insumo_proprio_id: null, qtd_p: 1, qtd_m: 0, qtd_g: 0, unidade: "unidade" });
                  if (ing.caixa_m_id) rows.push({ tipo_insumo: "embalagem_m", insumo_comprado_id: ing.caixa_m_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 1, qtd_g: 0, unidade: "unidade" });
                  if (ing.caixa_g_id) rows.push({ tipo_insumo: "embalagem_g", insumo_comprado_id: ing.caixa_g_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 0, qtd_g: 1, unidade: "unidade" });
                  return rows;
                }
                if (ing.tipo_insumo !== "comprado" && ing.tipo_insumo !== "proprio") return [];
                if (!ing.insumo_comprado_id && !ing.insumo_proprio_id) return [];
                return [{
                  tipo_insumo: ing.tipo_insumo as "comprado" | "proprio",
                  insumo_comprado_id: ing.insumo_comprado_id || null,
                  insumo_proprio_id: ing.insumo_proprio_id || null,
                  qtd_p: ing.qtd_p,
                  qtd_m: ing.qtd_m,
                  qtd_g: ing.qtd_g,
                  unidade: ing.unidade,
                }];
              })}
            />
          </DialogContent>

        </Dialog>
      </PageHeader>

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
        <EmptyState icon={Pizza} title="Nenhuma ficha técnica encontrada" description="Crie fichas técnicas para suas pizzas com custos detalhados." actionLabel="Nova Ficha" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="table-premium fade-up fade-up-d1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Nome</TableHead>
                <TableHead className="">Tipo</TableHead>
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
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ficha)} className="text-muted-foreground hover:text-foreground hover:bg-muted">
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
