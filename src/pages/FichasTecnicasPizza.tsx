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
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Pencil, Trash2, Plus, Filter, Search, X, Check, Pizza, AlertTriangle, Package, Sparkles, ArrowLeft, Star, Gem, Cookie, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { FichasCategoryTabs } from "@/components/fichas/FichasCategoryTabs";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/SkeletonCard";
import { fieldErrorClass, FieldError } from "@/components/FormFieldError";
import type { Tables } from "@/integrations/supabase/types";
import { formatQty } from "@/components/MoneyInput";
import { Money } from "@/components/Money";
import { matchesSearch } from "@/lib/utils";
import { requireActiveUnidadeId } from "@/hooks/useActiveUnidade";
import { BaseSelector } from "@/components/fichas/BaseSelector";
import { SalvarComoBaseDialog } from "@/components/fichas/SalvarComoBaseDialog";
import { useBasesFicha, type BaseIngredienteInput } from "@/hooks/useBasesFicha";
import { BordasSection } from "@/components/fichas/BordasSection";
import { useSugestaoQuantidade } from "@/hooks/useSugestaoQuantidade";

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

const normalizarTipoInsumo = (tipo: string) => tipo === "produzido" ? "proprio" : tipo;

export default function FichasTecnicasPizza() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { sugerir } = useSugestaoQuantidade();

  useEffect(() => {
    const tipo = searchParams.get("tipo");
    if (tipo && TIPOS.includes(tipo)) {
      setFiltroTipo(tipo);
      setCategoria(tipo);
    } else if (tipo === "bordas") {
      setFiltroTipo("todos");
      setCategoria("bordas");
    } else {
      setFiltroTipo("todos");
      setCategoria(null);
    }
  }, [searchParams]);

  const selecionarCategoria = (cat: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tipo", cat);
    setSearchParams(params, { replace: false });
  };
  const voltarCategorias = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("tipo");
    setSearchParams(params, { replace: false });
    setSelectedIds(new Set());
    setSearchTerm("");
  };
  const [autoOpenedEditId, setAutoOpenedEditId] = useState<string | null>(null);
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
        const tipoInsumo = normalizarTipoInsumo(ing.tipo_insumo);
        const id = tipoInsumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
        if (!id) return;
        const custoUnit = tipoInsumo === "comprado"
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
        const tipoInsumo = normalizarTipoInsumo(ing.tipo_insumo);
        rows.push({
          ficha_id: fichaId, tipo_insumo: tipoInsumo,
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
      const unidade_id = requireActiveUnidadeId();
      const { data: inserted, error } = await supabase
        .from("fichas_tecnicas_pizza")
        .insert({
          nome: data.nome,
          numero_ficha: data.numero_ficha || null,
          tipo: data.tipo || null,
          modo_preparo: data.modo_preparo || null,
          unidade_id,
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
    onSuccess: (_data, variables) => {
      invalidateAll();
      toast.success(`🍕 ${variables.nome || "Pizza"} no forno! Ficha cadastrada.`);
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
    onSuccess: (_data, variables) => {
      invalidateAll();
      toast.success(`🍕 ${variables.nome || "Ficha"} atualizada com carinho!`);
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
      toast.success("🗑️ Ficha excluída do cardápio.");
    },
    onError: (e) => appError("ERR-FTP-003", e),
  });

  const { data: basesPizza = [] } = useBasesFicha("pizza");

  /** Aplica os ingredientes de uma base diretamente no formulário (sem persistir).
   *  Usado quando ainda não existe ficha salva (ficha nova). */
  const aplicarBaseLocal = (baseId: string) => {
    const base = basesPizza.find((b) => b.id === baseId);
    if (!base) return;
    const ings = (base.ingredientes ?? []) as Array<{
      tipo_insumo: string;
      insumo_comprado_id: string | null;
      insumo_proprio_id: string | null;
      qtd_p: number | null;
      qtd_m: number | null;
      qtd_g: number | null;
      unidade: string;
    }>;

    const normalRows = ings.filter((i) => !i.tipo_insumo.startsWith("embalagem_"));
    const embalagemRows = ings.filter((i) => i.tipo_insumo.startsWith("embalagem_"));

    const ingredientesForm: IngredienteForm[] = normalRows.map((ing) => ({
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

    setForm((f) => ({ ...f, ingredientes: ingredientesForm }));
    setBaseOrigemId(baseId);
    toast.success(`Base "${base.nome}" aplicada (${ingredientesForm.length} item(ns)).`);
  };

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

  useEffect(() => {
    const editar = searchParams.get("editar");
    if (!editar || autoOpenedEditId === editar) return;
    const ficha = fichas.find((f) => f.id === editar);
    if (ficha) {
      handleEdit(ficha as FichaTecnica);
      setAutoOpenedEditId(editar);
    }
  }, [searchParams, fichas, autoOpenedEditId]);

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

  const filteredFichas = (filtroTipo === "todos" ? fichas : fichas.filter((f) => f.tipo === filtroTipo))
    .filter((f) => matchesSearch(f.nome, searchTerm) || matchesSearch(f.tipo, searchTerm));

  const allVisibleSelected = filteredFichas.length > 0 && filteredFichas.every((f) => selectedIds.has(f.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFichas.map((f) => f.id)));
    }
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`🗑️ Excluir ${ids.length} ficha${ids.length === 1 ? "" : "s"}? Essa ação não pode ser desfeita.`)) return;
    ids.forEach((id) => deleteMutation.mutate(id));
    setSelectedIds(new Set());
  };
  const handleBulkRecalc = () => {
    queryClient.invalidateQueries({ queryKey: ["fichas-tecnicas-pizza"] });
    queryClient.invalidateQueries({ queryKey: ["insumos-comprados"] });
    queryClient.invalidateQueries({ queryKey: ["insumos-proprios"] });
    toast.success(`Margens recalculadas para ${selectedIds.size} ficha${selectedIds.size === 1 ? "" : "s"}.`);
    setSelectedIds(new Set());
  };

  const getFilteredInsumos = (tipo: string) => {
    if (tipo === "comprado") {
      return insumosComprados.filter((ic) => matchesSearch(ic.nome, buscaIngrediente)).slice(0, 10);
    }
    return insumosProprios.filter((ip) => matchesSearch(ip.nome, buscaIngrediente)).slice(0, 10);
  };

  const getFilteredEmbalagemInsumos = () => {
    return insumosComprados
      .filter((ic) => ic.categoria === "Embalagens")
      .filter((ic) => matchesSearch(ic.nome, buscaEmbalagemTermo))
      .slice(0, 10);
  };

  const custoForm = calcularCustosForm();
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasInsumoSelected = (ing: IngredienteForm) =>
    normalizarTipoInsumo(ing.tipo_insumo) === "comprado" ? !!ing.insumo_comprado_id : !!ing.insumo_proprio_id;

  const CATEGORIAS_PIZZA = [
    { id: "tradicional", label: "Tradicionais", icon: Pizza, hint: "Massa, molho e clássicos" },
    { id: "especial", label: "Especiais", icon: Star, hint: "Combinações autorais" },
    { id: "premium", label: "Premium", icon: Gem, hint: "Ingredientes nobres" },
    { id: "doce", label: "Doces", icon: Cookie, hint: "Sobremesa em pizza" },
    { id: "bordas", label: "Bordas Recheadas", icon: CircleDot, hint: "P · M · G" },
  ];
  const countByTipo = (tipo: string) => fichas.filter((f) => f.tipo === tipo).length;
  const categoriaAtiva = CATEGORIAS_PIZZA.find((c) => c.id === categoria);

  return (
    <div className="space-y-6 page-enter">
      <FichasCategoryTabs />
      {/* Header */}
      <PageHeader title="Fichas Técnicas de Pizza" description={categoriaAtiva ? `Gerenciando: ${categoriaAtiva.label}` : "Selecione um grupo para gerenciar as receitas e custos por tamanho."}>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="btn-hot-cta gap-2 px-4">
              <Plus className="h-4 w-4" /> Nova Ficha
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-[1040px] w-screen h-[100dvh] max-h-[100dvh] rounded-none sm:w-[96vw] sm:h-[90vh] sm:max-h-[820px] sm:rounded-3xl p-0 gap-0 flex flex-col overflow-hidden border border-stone-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* HEADER: Nome + AI badge */}
            <DialogHeader className="border-b border-stone-200 shrink-0">
              <div className="w-full px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
                <DialogTitle asChild>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight break-words">
                        {form.nome || (editingId ? "Sem nome" : "Nova ficha")}
                      </h2>
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] sm:text-xs font-semibold">
                        <Sparkles className="h-3 w-3" />
                        <span className="hidden sm:inline">Proporções Inteligentes Ativas</span>
                        <span className="sm:hidden">Proporções IA</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      {form.numero_ficha && (
                        <span className="text-xs font-medium text-stone-500">{form.numero_ficha}</span>
                      )}
                      <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                        <SelectTrigger className="h-11 sm:h-8 flex-1 sm:flex-none sm:w-[140px] text-sm sm:text-xs font-medium border-stone-200 bg-transparent text-stone-700">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogTitle>
              </div>
            </DialogHeader>

            {/* COST-STRIP: P · M · G */}
            <div className="shrink-0 border-b border-stone-200 bg-stone-50/60">
              <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between sm:justify-start gap-3 sm:gap-6 flex-wrap">
                {[
                  { label: "P", dim: "25cm", value: custoForm.custoP },
                  { label: "M", dim: "30cm", value: custoForm.custoM },
                  { label: "G", dim: "35cm", value: custoForm.custoG },
                ].map((c, i) => (
                  <div key={c.label} className="flex items-baseline gap-1.5 sm:gap-2">
                    {i > 0 && <span className="hidden sm:inline text-stone-300">·</span>}
                    <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">{c.label}</span>
                    <span className="hidden sm:inline text-xs font-medium text-stone-500 tabular-nums">{c.dim}</span>
                    <Money value={c.value} className="text-sm font-bold text-stone-900" />
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="w-full px-4 sm:px-5 py-6 sm:py-8 space-y-8 sm:space-y-10">
                {editingId ? (
                  <BaseSelector
                    tipoFicha="pizza"
                    fichaId={editingId}
                    baseAplicadaId={baseOrigemId}
                    onBaseAplicada={async (baseId) => {
                      const ficha = fichas.find((f) => f.id === editingId);
                      if (ficha) {
                        await queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza_ingredientes"] });
                        await queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
                        await supabase.from("fichas_tecnicas_pizza").update({ base_origem_id: baseId }).eq("id", ficha.id);
                        handleEdit({ ...ficha, base_origem_id: baseId });
                      }
                    }}
                    onCriarNovaBase={() => setSalvarBaseOpen(true)}
                  />
                ) : (
                  <BaseSelector
                    tipoFicha="pizza"
                    fichaId={null}
                    baseAplicadaId={baseOrigemId}
                    onAplicarLocal={aplicarBaseLocal}
                    onCriarNovaBase={() => setSalvarBaseOpen(true)}
                  />
                )}

                {/* Dados principais — inputs minimalistas (tipo já está no header) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="nome" className="text-xs font-medium uppercase tracking-wider text-slate-500">Nome da Pizza</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Margherita, Calabresa"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      onBlur={() => setTouched(t => ({ ...t, nome: true }))}
                      className={cn("h-11 sm:h-10 text-base sm:text-sm font-medium border-slate-200", fieldErrorClass(nomeInvalid))}
                    />
                    <FieldError show={nomeInvalid} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numero_ficha" className="text-xs font-medium uppercase tracking-wider text-slate-500">Nº da Ficha</Label>
                    <Input
                      id="numero_ficha"
                      placeholder="FT-001"
                      value={form.numero_ficha}
                      onChange={(e) => setForm({ ...form, numero_ficha: e.target.value })}
                      className="h-11 sm:h-10 text-base sm:text-sm font-medium border-slate-200"
                    />
                  </div>
                </div>

                {/* INGREDIENTES — TABELA DENSA */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900 tracking-tight">Ingredientes</h3>
                    <Button type="button" size="sm" className="btn-action-add gap-1.5 h-11 sm:h-9 w-full sm:w-auto px-3 text-sm sm:text-xs font-medium" onClick={addIngrediente}>
                      <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Adicionar Ingrediente
                    </Button>
                  </div>

                  {(() => {
                    const normais = form.ingredientes
                      .map((ing, idx) => ({ ing, idx }))
                      .filter(({ ing }) => ing.tipo_insumo !== "embalagem");

                    if (normais.length === 0) {
                      return (
                        <div className={cn(
                          "rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-transparent",
                          ingredientesInvalid && "border-destructive/50 bg-destructive/5",
                        )}>
                          Nenhum ingrediente adicionado. Aplique uma base ou clique em "Adicionar Ingrediente".
                          {ingredientesInvalid && <p className="text-[11px] text-destructive mt-1 font-medium">Adicione pelo menos um ingrediente</p>}
                        </div>
                      );
                    }

                    return (
                      <>
                      {/* MOBILE: cards empilhados */}
                      <div className="md:hidden space-y-3">
                        {normais.map(({ ing, idx }) => {
                          const tipoInsumo = normalizarTipoInsumo(ing.tipo_insumo);
                          const insumoId = tipoInsumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
                          const custoUnit = tipoInsumo === "comprado"
                            ? (custoCompradoMap.get(insumoId) ?? 0)
                            : (custoProprioMap.get(insumoId) ?? 0);
                          const fromBase = !!ing.db_id && ingredientesBaseIds.has(ing.db_id);
                          const insumoCompradoSel = insumosComprados.find((i) => i.id === ing.insumo_comprado_id);
                          const insumoProprioSel = insumosProprios.find((i) => i.id === ing.insumo_proprio_id);
                          const familiaCompra = insumoCompradoSel
                            ? (["kg","g"].includes(insumoCompradoSel.unidade) ? "peso"
                              : ["L","ml"].includes(insumoCompradoSel.unidade) ? "volume" : "un")
                            : null;
                          const familiaUso = ["kg","g"].includes(ing.unidade) ? "peso"
                            : ["L","ml"].includes(ing.unidade) ? "volume" : "un";
                          const mismatchUnidade = tipoInsumo === "comprado" && familiaCompra && ing.unidade && familiaCompra !== familiaUso;
                          const nomeInsumo = ing.nome_display || insumoCompradoSel?.nome || insumoProprioSel?.nome || "";
                          const categoriaInsumo = (insumoCompradoSel as any)?.categoria ?? (insumoProprioSel as any)?.categoria ?? null;
                          const sug = ing.qtd_p > 0 ? sugerir(nomeInsumo, ing.qtd_p, categoriaInsumo) : { qtdM: 0, qtdG: 0 };
                          const isDoce = form.tipo === "doce";
                          const sugM = isDoce ? Math.round((sug.qtdM * 0.8) / 5) * 5 : sug.qtdM;
                          const sugG = isDoce ? Math.round((sug.qtdG * 0.8) / 5) * 5 : sug.qtdG;
                          const podeSugerir = ing.qtd_p > 0 && (ing.qtd_m === 0 || ing.qtd_g === 0) && (sugM > 0 || sugG > 0);
                          const aplicarSugestao = () => {
                            if (ing.qtd_m === 0 && sugM > 0) updateIngrediente(idx, "qtd_m", sugM);
                            if (ing.qtd_g === 0 && sugG > 0) updateIngrediente(idx, "qtd_g", sugG);
                          };
                          const renderQtdMobile = (qtdKey: "qtd_p" | "qtd_m" | "qtd_g", label: string, qtdVal: number, ph?: number) => (
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                                <Money value={custoUnit * converterQuantidade(qtdVal, ing.unidade)} className="text-[11px] font-semibold text-slate-600 tabular-nums" />
                              </div>
                              <Input
                                type="number" step="0.01" min="0" inputMode="decimal"
                                className="h-11 w-full text-center text-base font-semibold tabular-nums rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
                                value={qtdVal || ""}
                                onChange={(e) => updateIngrediente(idx, qtdKey, parseFloat(e.target.value) || 0)}
                                onBlur={() => autoSaveIngredienteQtd(ing, qtdKey, ing[qtdKey])}
                                placeholder={ph && ph > 0 ? `~${ph}` : label}
                              />
                            </div>
                          );
                          return (
                            <div key={`m-${idx}`} className={cn(
                              "rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-sm",
                              fromBase && "border-l-4 border-l-success",
                            )}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {fromBase && <Sparkles className="h-4 w-4 text-success shrink-0" />}
                                  <span className="text-sm font-semibold text-slate-900 truncate">
                                    {ing.nome_display || "Sem insumo"}
                                  </span>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 -mr-1" onClick={() => removeIngrediente(idx)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Select value={normalizarTipoInsumo(ing.tipo_insumo)} onValueChange={(v) => updateIngrediente(idx, "tipo_insumo", v)}>
                                  <SelectTrigger className="h-11 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="comprado">Comprado</SelectItem>
                                    <SelectItem value="proprio">Produzido</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={ing.unidade} onValueChange={(v) => updateIngrediente(idx, "unidade", v)}>
                                  <SelectTrigger className="h-11 text-sm"><SelectValue placeholder="Unidade" /></SelectTrigger>
                                  <SelectContent>
                                    {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>

                              {!hasInsumoSelected(ing) && (
                                <Popover open={buscaAberta === idx} onOpenChange={(o) => { if (!o) setBuscaAberta(null); }}>
                                  <PopoverAnchor asChild>
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                                      <Input
                                        placeholder="Buscar insumo..."
                                        className="pl-9 h-11 text-sm w-full"
                                        value={buscaAberta === idx ? buscaIngrediente : ""}
                                        onFocus={() => { if (buscaAberta !== idx) { setBuscaAberta(idx); setBuscaIngrediente(""); } }}
                                        onChange={(e) => { setBuscaAberta(idx); setBuscaIngrediente(e.target.value); }}
                                      />
                                    </div>
                                  </PopoverAnchor>
                                  <PopoverContent align="start" sideOffset={4} onOpenAutoFocus={(e) => e.preventDefault()}
                                    onInteractOutside={(e) => { const t = e.target as HTMLElement; if (t.closest('input')) e.preventDefault(); }}
                                    className="p-1 w-[var(--radix-popover-trigger-width)] max-h-64 overflow-y-auto rounded-xl shadow-lg">
                                    {getFilteredInsumos(ing.tipo_insumo).length === 0 ? (
                                      <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                                    ) : (
                                      getFilteredInsumos(ing.tipo_insumo).map((item) => (
                                        <button key={item.id} type="button"
                                          className="w-full text-left px-3 py-2.5 text-sm rounded-md hover:bg-accent hover:text-primary transition-colors truncate"
                                          onMouseDown={(e) => { e.preventDefault(); selectInsumo(idx, item.id, item.nome, ing.tipo_insumo); }}>
                                          <span className="font-medium">{item.nome}</span>
                                        </button>
                                      ))
                                    )}
                                  </PopoverContent>
                                </Popover>
                              )}

                              {mismatchUnidade && (
                                <p className="flex items-center gap-1 text-[11px] text-warning">
                                  <AlertTriangle className="h-3 w-3" />
                                  Comprado em <strong>{insumoCompradoSel?.unidade}</strong>, usando em <strong>{ing.unidade}</strong>
                                </p>
                              )}

                              <div className="grid grid-cols-3 gap-2">
                                {renderQtdMobile("qtd_p", "P", ing.qtd_p)}
                                {renderQtdMobile("qtd_m", "M", ing.qtd_m, sugM)}
                                {renderQtdMobile("qtd_g", "G", ing.qtd_g, sugG)}
                              </div>

                              {podeSugerir && (
                                <Button type="button" variant="outline" size="sm" onClick={aplicarSugestao}
                                  className="w-full h-10 gap-1.5 text-xs text-primary border-primary/30">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Aplicar sugestão M {sugM}{ing.unidade} · G {sugG}{ing.unidade}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* DESKTOP: tabela densa */}
                      <div className="hidden md:block w-full rounded-lg border border-slate-200 overflow-visible bg-white">
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow className="!bg-slate-50/60 border-b border-slate-200 hover:!bg-slate-50/60">
                              <TableHead className="w-[45%] px-4 h-10 text-[11px] font-medium uppercase tracking-wider text-slate-400 bg-transparent">Insumo</TableHead>
                              <TableHead className="w-[30%] px-4 h-10 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400 bg-transparent">Quantidades</TableHead>
                              <TableHead className="w-[25%] px-4 h-10 text-right text-[11px] font-medium uppercase tracking-wider text-slate-400 bg-transparent">Custos</TableHead>
                              <TableHead className="w-[44px] !px-1 bg-transparent"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {normais.map(({ ing, idx }) => {
                              const tipoInsumo = normalizarTipoInsumo(ing.tipo_insumo);
                              const insumoId = tipoInsumo === "comprado" ? ing.insumo_comprado_id : ing.insumo_proprio_id;
                              const custoUnit = tipoInsumo === "comprado"
                                ? (custoCompradoMap.get(insumoId) ?? 0)
                                : (custoProprioMap.get(insumoId) ?? 0);
                              const fromBase = !!ing.db_id && ingredientesBaseIds.has(ing.db_id);

                              const insumoCompradoSel = insumosComprados.find((i) => i.id === ing.insumo_comprado_id);
                              const insumoProprioSel = insumosProprios.find((i) => i.id === ing.insumo_proprio_id);
                              const familiaCompra = insumoCompradoSel
                                ? (["kg", "g"].includes(insumoCompradoSel.unidade) ? "peso"
                                  : ["L", "ml"].includes(insumoCompradoSel.unidade) ? "volume" : "un")
                                : null;
                              const familiaUso = ["kg", "g"].includes(ing.unidade) ? "peso"
                                : ["L", "ml"].includes(ing.unidade) ? "volume" : "un";
                              const mismatchUnidade = tipoInsumo === "comprado" && familiaCompra && ing.unidade && familiaCompra !== familiaUso;

                              // Sugestão fantasma a partir do P
                              const nomeInsumo = ing.nome_display
                                || insumoCompradoSel?.nome
                                || insumoProprioSel?.nome
                                || "";
                              const categoriaInsumo = (insumoCompradoSel as any)?.categoria
                                ?? (insumoProprioSel as any)?.categoria
                                ?? null;
                              const sug = ing.qtd_p > 0 ? sugerir(nomeInsumo, ing.qtd_p, categoriaInsumo) : { qtdM: 0, qtdG: 0 };
                              // Pizza doce: reduz a sugestão (incrementos menores)
                              const isDoce = form.tipo === "doce";
                              const sugM = isDoce ? Math.round((sug.qtdM * 0.8) / 5) * 5 : sug.qtdM;
                              const sugG = isDoce ? Math.round((sug.qtdG * 0.8) / 5) * 5 : sug.qtdG;
                              const podeSugerir = ing.qtd_p > 0 && (ing.qtd_m === 0 || ing.qtd_g === 0) && (sugM > 0 || sugG > 0);

                              const aplicarSugestao = () => {
                                if (ing.qtd_m === 0 && sugM > 0) updateIngrediente(idx, "qtd_m", sugM);
                                if (ing.qtd_g === 0 && sugG > 0) updateIngrediente(idx, "qtd_g", sugG);
                              };

                              const renderQtdInput = (
                                qtdKey: "qtd_p" | "qtd_m" | "qtd_g",
                                qtdVal: number,
                                placeholderSugestao?: number,
                              ) => {
                                const invalid = qtdVal < 0 || qtdVal > 999;
                                return (
                                  <Input
                                    type="number" step="0.01" min="0"
                                    className={cn(
                                      "h-10 w-[72px] text-center text-sm font-semibold tabular-nums px-2 rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm placeholder:text-muted-foreground/50 placeholder:italic !min-w-0 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500",
                                      invalid && "border-destructive focus-visible:border-destructive",
                                    )}
                                    value={qtdVal || ""}
                                    onChange={(e) => updateIngrediente(idx, qtdKey, parseFloat(e.target.value) || 0)}
                                    onBlur={() => autoSaveIngredienteQtd(ing, qtdKey, ing[qtdKey])}
                                    placeholder={placeholderSugestao && placeholderSugestao > 0 ? `~${placeholderSugestao}` : qtdKey === "qtd_p" ? "P" : qtdKey === "qtd_m" ? "M" : "G"}
                                  />
                                );
                              };

                              return (
                                <TableRow
                                  key={idx}
                                  className={cn(
                                    "group !hover:!bg-foreground/[0.02]",
                                    fromBase && "border-l-2 border-l-success",
                                  )}
                                >
                                  {/* BLOCO 1 — INSUMO: tipo + busca (flex-1) + unidade */}
                                  <TableCell className="align-middle !py-3 !px-4 overflow-visible relative">
                                    <div className="flex items-center gap-3 w-full">
                                      <Select value={normalizarTipoInsumo(ing.tipo_insumo)} onValueChange={(v) => updateIngrediente(idx, "tipo_insumo", v)}>
                                        <SelectTrigger className="h-10 w-[120px] shrink-0 text-xs px-2.5"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="comprado">Comprado</SelectItem>
                                          <SelectItem value="proprio">Produzido</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="flex-1 relative min-w-0">
                                        {hasInsumoSelected(ing) ? (
                                          <div className="flex items-center gap-1.5 h-10 px-3 rounded-md bg-muted/40">
                                            <span className="text-sm font-medium text-foreground truncate" title={ing.nome_display}>{ing.nome_display}</span>
                                            {fromBase && (
                                              <Sparkles className="h-3.5 w-3.5 text-success shrink-0" aria-label="da base" />
                                            )}
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 ml-auto" onClick={() => clearInsumoSelection(idx)}>
                                              <X className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Popover open={buscaAberta === idx} onOpenChange={(o) => { if (!o) setBuscaAberta(null); }}>
                                            <PopoverAnchor asChild>
                                              <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                                                <Input
                                                  placeholder="Buscar insumo..."
                                                  className="pl-9 h-10 text-sm w-full"
                                                  value={buscaAberta === idx ? buscaIngrediente : ""}
                                                  onFocus={() => { if (buscaAberta !== idx) { setBuscaAberta(idx); setBuscaIngrediente(""); } }}
                                                  onChange={(e) => { setBuscaAberta(idx); setBuscaIngrediente(e.target.value); }}
                                                />
                                              </div>
                                            </PopoverAnchor>
                                            <PopoverContent
                                              align="start"
                                              sideOffset={4}
                                              onOpenAutoFocus={(e) => e.preventDefault()}
                                              onInteractOutside={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (target.closest('input')) e.preventDefault();
                                              }}
                                              className="p-1 w-[var(--radix-popover-trigger-width)] max-h-56 overflow-y-auto rounded-xl shadow-lg"
                                            >
                                              {getFilteredInsumos(ing.tipo_insumo).length === 0 ? (
                                                <p className="p-2 text-xs text-muted-foreground">Nenhum insumo encontrado.</p>
                                              ) : (
                                                getFilteredInsumos(ing.tipo_insumo).map((item) => (
                                                  <button key={item.id} type="button" className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-primary transition-colors truncate"
                                                    onMouseDown={(e) => { e.preventDefault(); selectInsumo(idx, item.id, item.nome, ing.tipo_insumo); }}>
                                                    <span className="font-medium">{item.nome}</span>
                                                  </button>
                                                ))
                                              )}
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                      <Select value={ing.unidade} onValueChange={(v) => updateIngrediente(idx, "unidade", v)}>
                                        <SelectTrigger className="h-10 w-[96px] shrink-0 text-xs px-2.5"><SelectValue placeholder="Un" /></SelectTrigger>
                                        <SelectContent>
                                          {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {mismatchUnidade && (
                                      <p className="flex items-center gap-1 text-[10px] text-warning mt-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Comprado em <strong>{insumoCompradoSel?.unidade}</strong>, usando em <strong>{ing.unidade}</strong>
                                      </p>
                                    )}
                                  </TableCell>

                                  {/* BLOCO 2 — QUANTIDADES P/M/G */}
                                  <TableCell className="align-middle !py-3 !px-4">
                                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                      {renderQtdInput("qtd_p", ing.qtd_p)}
                                      {renderQtdInput("qtd_m", ing.qtd_m, sugM)}
                                      {renderQtdInput("qtd_g", ing.qtd_g, sugG)}
                                      {podeSugerir && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          title={`Aplicar sugestão: M ${sugM}g · G ${sugG}g`}
                                          onClick={aplicarSugestao}
                                          className="h-7 w-7 text-primary hover:bg-primary/10 shrink-0"
                                        >
                                          <Sparkles className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>

                                  {/* BLOCO 3 — CUSTOS: valores empilhados, sem labels P/M/G */}
                                  <TableCell className="align-middle !py-3 !px-4 text-right">
                                    <div className="flex flex-col justify-center items-end min-w-[80px] leading-tight">
                                      <Money value={custoUnit * converterQuantidade(ing.qtd_p, ing.unidade)} className="text-[13px] font-semibold text-slate-600 py-0.5" />
                                      <Money value={custoUnit * converterQuantidade(ing.qtd_m, ing.unidade)} className="text-[13px] font-semibold text-slate-600 py-0.5" />
                                      <Money value={custoUnit * converterQuantidade(ing.qtd_g, ing.unidade)} className="text-[13px] font-semibold text-slate-600 py-0.5" />
                                    </div>
                                  </TableCell>

                                  <TableCell className="align-middle !py-3 !px-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                      onClick={() => removeIngrediente(idx)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

                  const embalagensDisponiveis = insumosComprados.filter((ic) => ic.categoria === "Embalagens");

                  const renderCaixaSlot = (size: "p" | "m" | "g", label: string, dim: string, caixaId: string, caixaNome: string) => {
                    const custo = custoCompradoMap.get(caixaId) ?? 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Caixa {label}</span>
                          <span className="text-[11px] font-medium text-slate-400 tabular-nums">{dim}</span>
                        </div>
                        {embalagensDisponiveis.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic px-3 py-2 border border-dashed border-slate-200 rounded-md">
                            Nenhuma embalagem cadastrada.
                          </div>
                        ) : (
                          <Select
                            value={caixaId || undefined}
                            onValueChange={(id) => {
                              const item = embalagensDisponiveis.find((i) => i.id === id);
                              if (item) selectEmbalagemInsumo(embIdx, size, item.id, item.nome);
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs font-medium border-slate-200">
                              <SelectValue placeholder="Selecionar caixa" />
                            </SelectTrigger>
                            <SelectContent>
                              {embalagensDisponiveis.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <span className="font-medium">{item.nome}</span>
                                  <span className="text-xs text-slate-500 ml-2 tabular-nums">R$ {fmt(custoCompradoMap.get(item.id) ?? 0)}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {caixaId && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 truncate font-medium" title={caixaNome}>{caixaNome}</span>
                            <Money value={custo} className="font-semibold text-slate-900" />
                          </div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-500" />
                          <h3 className="text-base font-semibold text-slate-900 tracking-tight">Embalagens por Tamanho</h3>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-xs font-medium text-slate-500 hover:text-destructive" onClick={() => removeIngrediente(embIdx)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                        </Button>
                      </div>

                      {faltando && (
                        <div className="flex items-center gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Faltam embalagens — selecione caixa para cada tamanho usado.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-6">
                        {renderCaixaSlot("p", "P", "25cm", ing.caixa_p_id, ing.caixa_p_nome)}
                        {renderCaixaSlot("m", "M", "30cm", ing.caixa_m_id, ing.caixa_m_nome)}
                        {renderCaixaSlot("g", "G", "35cm", ing.caixa_g_id, ing.caixa_g_nome)}
                      </div>

                      {/* EXTRAS — pills com toggle */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-stone-900">Extras Disponíveis</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "🍅 Ketchup", on: ketchupOn, terms: ketchupTerms, allowed: !isPizzaDoce },
                            { label: "🥚 Maionese", on: maioneseOn, terms: maioneseTerms, allowed: !isPizzaDoce },
                            { label: "🪑 Mesinha", on: mesinhaOn, terms: mesinhaTerms, allowed: true },
                          ].map((x) => (
                            <button
                              key={x.label}
                              type="button"
                              disabled={!x.allowed && !x.on}
                              onClick={() => toggleExtra(x.terms, x.label)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition border-0",
                                x.on
                                  ? "bg-slate-800 text-white"
                                  : x.allowed
                                    ? "bg-slate-200 text-slate-400 hover:bg-slate-300"
                                    : "bg-slate-100 text-slate-300 cursor-not-allowed",
                              )}
                            >
                              <span>{x.label}</span>
                              {x.on && <span className="text-[11px] opacity-80">✓</span>}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-stone-500 italic">
                          ✨ Ketchup e Maionese são desativados automaticamente se a pizza for Doce.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* MODO DE PREPARO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="modo_preparo" className="text-xs font-bold uppercase tracking-wider text-stone-900 m-0">Modo de Preparo</Label>
                    <button
                      type="button"
                      onClick={() => {
                        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                        if (!SR) {
                          toast.error("Ditado não suportado", { description: "Seu navegador não suporta reconhecimento de voz." });
                          return;
                        }
                        const rec = new SR();
                        rec.lang = "pt-BR";
                        rec.interimResults = false;
                        rec.continuous = false;
                        toast("🎙️ Ouvindo...", { description: "Fale o modo de preparo." });
                        rec.onresult = (e: any) => {
                          const txt = e.results[0][0].transcript;
                          setForm((f) => ({ ...f, modo_preparo: (f.modo_preparo ? f.modo_preparo + "\n" : "") + txt }));
                        };
                        rec.onerror = () => toast.error("Erro no ditado");
                        rec.start();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition"
                    >
                      🎙️ Ditar Receita
                    </button>
                  </div>
                  <Textarea
                    id="modo_preparo"
                    placeholder="Descreva o passo a passo ou use o assistente de voz..."
                    value={form.modo_preparo}
                    onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })}
                    rows={3}
                    className="text-sm border-stone-200 resize-none rounded-xl"
                  />
                </div>
                </div>
              </div>

              {/* STICKY FOOTER */}
              <div className="border-t border-slate-200 bg-white shrink-0">
                <div className="w-full px-5 h-16 flex items-center justify-between gap-6">
                  <div className="flex items-center divide-x divide-slate-200">
                    {[
                      { l: "P", v: custoForm.custoP },
                      { l: "M", v: custoForm.custoM },
                      { l: "G", v: custoForm.custoG },
                    ].map((t) => (
                      <div key={t.l} className="flex items-baseline gap-2 px-5 first:pl-0 last:pr-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total {t.l}</span>
                        <Money value={t.v} className="text-base font-semibold text-slate-900 tabular-nums" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {form.ingredientes.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 gap-1.5"
                        onClick={() => setSalvarBaseOpen(true)}
                      >
                        <Sparkles className="h-4 w-4" />
                        Salvar como base
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-10 px-4" onClick={resetForm}>Cancelar</Button>
                    <Button type="submit" size="sm" className="h-10 px-6" disabled={insertMutation.isPending || updateMutation.isPending || (!editingId && !formIsValid)} >
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
              linhasIgnoradas={form.ingredientes.filter((ing) => {
                if (ing.tipo_insumo === "embalagem") {
                  return !ing.caixa_p_id && !ing.caixa_m_id && !ing.caixa_g_id;
                }
                const tipoInsumo = normalizarTipoInsumo(ing.tipo_insumo);
                if (tipoInsumo !== "comprado" && tipoInsumo !== "proprio") return false;
                return tipoInsumo === "comprado" ? !ing.insumo_comprado_id : !ing.insumo_proprio_id;
              }).length}
              ingredientes={form.ingredientes.flatMap<BaseIngredienteInput>((ing) => {
                if (ing.tipo_insumo === "embalagem") {
                  const rows: BaseIngredienteInput[] = [];
                  if (ing.caixa_p_id) rows.push({ tipo_insumo: "embalagem_p", insumo_comprado_id: ing.caixa_p_id, insumo_proprio_id: null, qtd_p: 1, qtd_m: 0, qtd_g: 0, unidade: "unidade" });
                  if (ing.caixa_m_id) rows.push({ tipo_insumo: "embalagem_m", insumo_comprado_id: ing.caixa_m_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 1, qtd_g: 0, unidade: "unidade" });
                  if (ing.caixa_g_id) rows.push({ tipo_insumo: "embalagem_g", insumo_comprado_id: ing.caixa_g_id, insumo_proprio_id: null, qtd_p: 0, qtd_m: 0, qtd_g: 1, unidade: "unidade" });
                  return rows;
                }
                const tipoInsumo = normalizarTipoInsumo(ing.tipo_insumo);
                if (tipoInsumo !== "comprado" && tipoInsumo !== "proprio") return [];
                if (tipoInsumo === "comprado" && !ing.insumo_comprado_id) return [];
                if (tipoInsumo === "proprio" && !ing.insumo_proprio_id) return [];
                return [{
                  tipo_insumo: tipoInsumo as "comprado" | "proprio",
                  insumo_comprado_id: tipoInsumo === "comprado" ? ing.insumo_comprado_id || null : null,
                  insumo_proprio_id: tipoInsumo === "proprio" ? ing.insumo_proprio_id || null : null,
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

      {/* TELA 1: Grid de Categorias */}
      {!categoria && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 fade-up">
          {CATEGORIAS_PIZZA.map(({ id, label, icon: Icon, hint }) => {
            const count = id === "bordas" ? null : countByTipo(id);
            return (
              <button
                key={id}
                onClick={() => selecionarCategoria(id)}
                className="group text-left bg-card border border-border rounded-2xl p-5 h-[148px] flex flex-col justify-between transition-all duration-200 hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_hsl(var(--primary)/0.25)]"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="text-base font-bold text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {count === null ? hint : `${count} ${count === 1 ? "receita" : "receitas"}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* TELA 2: Conteúdo da Categoria */}
      {categoria && (
        <>
          <button
            onClick={voltarCategorias}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para Categorias
          </button>

      {/* Filtros: busca instantânea + tipo (oculto em "bordas") */}
      {categoria !== "bordas" && (<>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar receitas por nome ou tipo..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[200px]">
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
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20 fade-up">
          <span className="text-sm font-medium text-primary">
            {selectedIds.size} {selectedIds.size === 1 ? "item selecionado" : "itens selecionados"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Limpar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <Button size="sm" onClick={handleBulkRecalc}>
              <Sparkles className="h-4 w-4" /> Recalcular Margem
            </Button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : filteredFichas.length === 0 ? (
        <EmptyState icon={Pizza} title="Nenhuma ficha técnica encontrada" description="Crie fichas técnicas para suas pizzas com custos detalhados." actionLabel="Nova Ficha" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="table-premium fade-up fade-up-d1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todas as fichas"
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFichas.map((ficha) => {
                const custos = calcularCustosFicha(ficha.id);
                const isSelected = selectedIds.has(ficha.id);
                return (
                  <TableRow
                    key={ficha.id}
                    data-state={isSelected ? "selected" : undefined}
                    className="group cursor-pointer transition-all duration-150"
                    onClick={() => handleEdit(ficha)}
                  >
                    <TableCell className="w-[44px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectOne(ficha.id)}
                        aria-label={`Selecionar ${ficha.nome}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {ficha.nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {ficha.tipo ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end justify-center min-w-[80px]">
                        <Money value={custos.custoP} className="text-[13px] font-semibold text-slate-600 py-0.5" />
                        <Money value={custos.custoM} className="text-[13px] font-semibold text-slate-600 py-0.5" />
                        <Money value={custos.custoG} className="text-[13px] font-semibold text-slate-600 py-0.5" />
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Excluir ficha"
                          onClick={() => {
                            if (confirm(`🗑️ Excluir "${ficha.nome}"? Essa ação não pode ser desfeita.`)) {
                              deleteMutation.mutate(ficha.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <span className="text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-150 text-xs">
                          ▶
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </>)}

          {/* Bordas Recheadas (P · M · G) — somente na categoria "bordas" */}
          {categoria === "bordas" && <BordasSection />}
        </>
      )}
    </div>
  );
}
