import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Plus, Trash2, Calculator, CheckCircle2, AlertTriangle, Edit2, Trash, Sparkles } from "lucide-react";
import { formatMoney, parseFormattedNumber } from "@/components/MoneyInput";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface ComboItem {
  tipo: "pizza" | "produto" | "bebida";
  id: string;
  nome: string;
  tamanho?: "p" | "m" | "g";
  quantidade: number;
  custo_unitario: number;
  preco_unitario: number;
}

interface InsumoComprado {
  id: string;
  nome: string;
  preco_pago: number;
  quantidade: number;
  unidade: string;
  categoria: string;
}

interface InsumoProprio {
  id: string;
  nome: string;
  rendimento: number;
  unidade_rendimento: string;
}

interface InsumoProprioIngrediente {
  insumo_proprio_id: string | null;
  insumo_comprado_id: string | null;
  quantidade: number;
  unidade: string;
}

interface FichaPizza {
  id: string;
  nome: string;
  tipo: string | null;
  preco_venda_p: number | null;
  preco_venda_m: number | null;
  preco_venda_g: number | null;
}

interface PizzaIngrediente {
  ficha_id: string | null;
  tipo_insumo: string;
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  qtd_p: number | null;
  qtd_m: number | null;
  qtd_g: number | null;
  unidade: string;
}

interface FichaProduto {
  id: string;
  nome: string;
  categoria: string;
  preco_venda: number | null;
}

interface ProdutoIngrediente {
  ficha_id: string;
  tipo_insumo: string;
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  quantidade: number;
  unidade: string;
}

interface PrecificacaoBebida {
  id: string;
  insumo_comprado_id: string;
  preco_venda: number;
}

interface PrecificacaoProduto {
  id: string;
  ficha_id: string;
  preco_venda: number;
}

interface ComboFixo {
  id: string;
  nome: string;
  itens: ComboItem[];
  preco_venda: number;
  custo_total: number;
  preco_separado: number;
  margem: number;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const converterQuantidade = (qtd: number, unidade: string) =>
  unidade === "g" || unidade === "ml" ? qtd / 1000 : qtd;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(0)}%`;

const tamanhoLabel: Record<string, string> = { p: "P", m: "M", g: "G" };

// ─── Component ───────────────────────────────────────────────────────
export default function ComboSimulator() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("Combo Novo");
  const [itens, setItens] = useState<ComboItem[]>([]);
  const [precoVendaStr, setPrecoVendaStr] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insumos_comprados").select("*");
      if (error) throw error;
      return data as InsumoComprado[];
    },
  });

  const { data: insumosProprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insumos_proprios").select("*");
      if (error) throw error;
      return data as InsumoProprio[];
    },
  });

  const { data: ingredientesProprios = [] } = useQuery({
    queryKey: ["insumos_proprios_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insumos_proprios_ingredientes").select("*");
      if (error) throw error;
      return data as InsumoProprioIngrediente[];
    },
  });

  const { data: fichasPizza = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_pizza").select("*").order("nome");
      if (error) throw error;
      return data as FichaPizza[];
    },
  });

  const { data: pizzaIngredientes = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_pizza_ingredientes").select("*");
      if (error) throw error;
      return data as PizzaIngrediente[];
    },
  });

  const { data: fichasProduto = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_produtos").select("*").order("nome");
      if (error) throw error;
      return data as FichaProduto[];
    },
  });

  const { data: produtoIngredientes = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_produtos_ingredientes").select("*");
      if (error) throw error;
      return data as ProdutoIngrediente[];
    },
  });

  const { data: precBebidas = [] } = useQuery({
    queryKey: ["precificacao_bebidas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("precificacao_bebidas").select("*");
      if (error) throw error;
      return data as PrecificacaoBebida[];
    },
  });

  const { data: precProdutos = [] } = useQuery({
    queryKey: ["precificacao_produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("precificacao_produtos").select("*");
      if (error) throw error;
      return data as PrecificacaoProduto[];
    },
  });

  const { data: combosExistentes = [], isLoading: combosLoading } = useQuery({
    queryKey: ["combos_fixos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("combos_fixos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((c) => ({
        ...c,
        itens: (c.itens as ComboItem[]) || [],
      })) as ComboFixo[];
    },
  });

  // ─── Cost maps ───────────────────────────────────────────────────
  const custoCompradoMap = useMemo(() => {
    const m = new Map<string, number>();
    insumosComprados.forEach((ic) =>
      m.set(ic.id, Number(ic.preco_pago) / Number(ic.quantidade))
    );
    return m;
  }, [insumosComprados]);

  const custoProprioMap = useMemo(() => {
    const m = new Map<string, number>();
    insumosProprios.forEach((ip) => {
      const ings = ingredientesProprios.filter((i) => i.insumo_proprio_id === ip.id);
      const custoTotal = ings.reduce((acc, ing) => {
        const custoUnit = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
        const qtd = converterQuantidade(Number(ing.quantidade), ing.unidade);
        return acc + custoUnit * qtd;
      }, 0);
      m.set(ip.id, Number(ip.rendimento) > 0 ? custoTotal / Number(ip.rendimento) : 0);
    });
    return m;
  }, [insumosProprios, ingredientesProprios, custoCompradoMap]);

  // Pizza cost by size
  const pizzaCustos = useMemo(() => {
    const result: Record<string, { p: number; m: number; g: number }> = {};
    fichasPizza.forEach((f) => {
      const ings = pizzaIngredientes.filter((i) => i.ficha_id === f.id);
      let cp = 0, cm = 0, cg = 0;
      ings.forEach((ing) => {
        if (ing.tipo_insumo.startsWith("embalagem_")) {
          const custoUnit = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
          if (ing.tipo_insumo === "embalagem_p") cp += custoUnit * Number(ing.qtd_p ?? 0);
          else if (ing.tipo_insumo === "embalagem_m") cm += custoUnit * Number(ing.qtd_m ?? 0);
          else if (ing.tipo_insumo === "embalagem_g") cg += custoUnit * Number(ing.qtd_g ?? 0);
        } else {
          const custoUnit =
            ing.tipo_insumo === "comprado"
              ? custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0
              : custoProprioMap.get(ing.insumo_proprio_id ?? "") ?? 0;
          cp += custoUnit * converterQuantidade(Number(ing.qtd_p ?? 0), ing.unidade);
          cm += custoUnit * converterQuantidade(Number(ing.qtd_m ?? 0), ing.unidade);
          cg += custoUnit * converterQuantidade(Number(ing.qtd_g ?? 0), ing.unidade);
        }
      });
      result[f.id] = { p: cp, m: cm, g: cg };
    });
    return result;
  }, [fichasPizza, pizzaIngredientes, custoCompradoMap, custoProprioMap]);

  // Product cost
  const produtoCustoMap = useMemo(() => {
    const m = new Map<string, number>();
    fichasProduto.forEach((f) => {
      const ings = produtoIngredientes.filter((i) => i.ficha_id === f.id);
      const custo = ings.reduce((acc, ing) => {
        const custoUnit =
          ing.tipo_insumo === "comprado"
            ? custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0
            : custoProprioMap.get(ing.insumo_proprio_id ?? "") ?? 0;
        return acc + custoUnit * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      m.set(f.id, custo);
    });
    return m;
  }, [fichasProduto, produtoIngredientes, custoCompradoMap, custoProprioMap]);

  // Precification maps
  const precBebidaMap = useMemo(() => {
    const m = new Map<string, number>();
    precBebidas.forEach((p) => m.set(p.insumo_comprado_id, Number(p.preco_venda)));
    return m;
  }, [precBebidas]);

  const precProdutoMap = useMemo(() => {
    const m = new Map<string, number>();
    precProdutos.forEach((p) => m.set(p.ficha_id, Number(p.preco_venda)));
    return m;
  }, [precProdutos]);

  // Beverages from insumos
  const bebidasIndustrializadas = useMemo(
    () => insumosComprados.filter((i) => i.categoria === "Bebidas"),
    [insumosComprados]
  );

  // ─── Add item helpers ────────────────────────────────────────────
  const addPizza = useCallback(
    (pizza: FichaPizza, tamanho: "p" | "m" | "g") => {
      const custos = pizzaCustos[pizza.id];
      const custo = custos?.[tamanho] ?? 0;
      const precoKey = `preco_venda_${tamanho}` as keyof FichaPizza;
      const preco = Number(pizza[precoKey] ?? 0);
      setItens((prev) => [
        ...prev,
        {
          tipo: "pizza",
          id: pizza.id,
          nome: `${pizza.nome} (${tamanhoLabel[tamanho]})`,
          tamanho,
          quantidade: 1,
          custo_unitario: custo,
          preco_unitario: preco,
        },
      ]);
      setShowPicker(false);
    },
    [pizzaCustos]
  );

  const addProduto = useCallback(
    (produto: FichaProduto) => {
      const custo = produtoCustoMap.get(produto.id) ?? 0;
      const preco = precProdutoMap.get(produto.id) ?? Number(produto.preco_venda ?? 0);
      setItens((prev) => [
        ...prev,
        {
          tipo: "produto",
          id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          custo_unitario: custo,
          preco_unitario: preco,
        },
      ]);
      setShowPicker(false);
    },
    [produtoCustoMap, precProdutoMap]
  );

  const addBebida = useCallback(
    (bebida: InsumoComprado) => {
      const custo = Number(bebida.preco_pago) / Number(bebida.quantidade);
      const preco = precBebidaMap.get(bebida.id) ?? 0;
      setItens((prev) => [
        ...prev,
        {
          tipo: "bebida",
          id: bebida.id,
          nome: bebida.nome,
          quantidade: 1,
          custo_unitario: custo,
          preco_unitario: preco,
        },
      ]);
      setShowPicker(false);
    },
    [precBebidaMap]
  );

  const removeItem = (idx: number) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Calculations ────────────────────────────────────────────────
  const custoTotal = useMemo(
    () => itens.reduce((s, i) => s + i.custo_unitario * i.quantidade, 0),
    [itens]
  );

  const precoSeparado = useMemo(
    () => itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0),
    [itens]
  );

  const precoVenda = parseFormattedNumber(precoVendaStr);
  const margem = precoVenda > 0 ? ((precoVenda - custoTotal) / precoVenda) * 100 : 0;
  const cmvPct = precoVenda > 0 ? (custoTotal / precoVenda) * 100 : 0;

  const margemColor = margem > 50 ? "text-success" : margem >= 30 ? "text-warning" : "text-destructive";
  const margemBg = margem > 50 ? "status-profit" : margem >= 30 ? "status-warning" : "status-loss";
  const margemLabel = margem > 50 ? "Combo Lucrativo" : margem >= 30 ? "Margem Aceitável" : "Combo com Prejuízo";

  // ─── Save mutation ───────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome");
      if (itens.length === 0) throw new Error("Adicione itens");
      if (precoVenda <= 0) throw new Error("Informe o preço de venda");

      const payload = {
        nome: nome.trim(),
        itens: itens as any,
        preco_venda: precoVenda,
        custo_total: custoTotal,
        preco_separado: precoSeparado,
        margem,
      };

      if (editingId) {
        const { error } = await supabase
          .from("combos_fixos")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("combos_fixos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combos_fixos"] });
      toast.success(editingId ? "Combo atualizado!" : "Combo salvo!");
      resetForm();
    },
    onError: (e: any) => appError("ERR-PRO-010", e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("combos_fixos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combos_fixos"] });
      toast.success("Combo excluído!");
    },
    onError: (e) => appError("ERR-PRO-011", e),
  });

  const resetForm = () => {
    setNome("Combo Novo");
    setItens([]);
    setPrecoVendaStr("");
    setEditingId(null);
  };

  const editCombo = (combo: ComboFixo) => {
    setNome(combo.nome);
    setItens(combo.itens);
    setPrecoVendaStr(String(combo.preco_venda).replace(".", ","));
    setEditingId(combo.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Categorize products for picker ──────────────────────────────
  const categoriaLabel: Record<string, string> = {
    sanduiche: "Sanduíches",
    prato: "Pratos",
    sobremesa: "Sobremesas",
    bebida: "Bebidas Preparadas",
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Simulador de Combos" description="Monte a promoção e descubra se ela dá lucro de verdade." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: BUILD */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-premium">
            <input
              type="text"
              placeholder="Nome da Promoção (ex: Combo Fim de Semana)"
              className="w-full bg-background border border-border rounded-lg p-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition mb-4"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            {/* Items list */}
            <div className="space-y-3 mb-4">
              {itens.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-background p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-secondary text-xs px-2 py-1 rounded text-muted-foreground font-mono-data">
                      {item.quantidade}x
                    </span>
                    <span className="text-sm">{item.nome}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono-data text-muted-foreground">
                      Custo: {fmt(item.custo_unitario)}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {itens.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-6">
                  Nenhum item adicionado. Clique abaixo para começar.
                </p>
              )}
            </div>

            <button
              onClick={() => setShowPicker(true)}
              className="btn-action-add w-full py-3 rounded-lg flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Adicionar Produto ao Combo
            </button>
          </div>
        </div>

        {/* RIGHT: ANALYSIS */}
        <div className="space-y-4">
          <div className="card-premium sticky top-6">
            <h3 className="label-upper mb-4 border-b border-border pb-2">
              Análise de Lucro
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Custo Real Total:</span>
                <span className="font-mono-data text-money">{fmt(custoTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço Separado:</span>
                <span className="font-mono-data line-through text-destructive">
                  {precoSeparado > 0 ? fmt(precoSeparado) : "—"}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs text-primary font-bold mb-2 uppercase tracking-wide">
                Por quanto vai vender? (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                className="w-full bg-background border-2 border-primary rounded-lg p-4 text-3xl font-mono-data text-foreground text-center focus:outline-none "
                placeholder="0,00"
                value={precoVendaStr}
                onChange={(e) => setPrecoVendaStr(e.target.value)}
              />
            </div>

            {/* Doughnut Chart */}
            {precoVenda > 0 && (
              <div className="mb-6">
                <div className="relative w-40 h-40 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Custo", value: custoTotal },
                          { name: "Lucro", value: Math.max(precoVenda - custoTotal, 0) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius="75%"
                        outerRadius="95%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#FF9F43" />
                        <Cell fill="#2ECC71" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-mono-data font-bold ${margemColor}`}>
                      {fmtPct(margem)}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem</span>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF9F43" }} />
                    <span className="text-muted-foreground">Custo</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#2ECC71" }} />
                    <span className="text-muted-foreground">Lucro</span>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis */}
            <div className="bg-background border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Margem de Lucro</p>
              <p className={`text-3xl font-mono-data font-bold mb-2 ${margemColor}`}>
                {precoVenda > 0 ? fmtPct(margem) : "—"}
              </p>
              {precoVenda > 0 && (
                <div className={`inline-flex items-center gap-1 text-xs py-1 px-3 rounded-full ${margemBg}`}>
                  {margem > 50 ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : margem >= 30 ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {margemLabel} (CMV {fmtPct(cmvPct)})
                </div>
              )}
            </div>

            <button
              className="w-full mt-6 py-3 px-6 rounded-lg text-sm font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#2ECC71" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#27AE60"; e.currentTarget.style.boxShadow = "0 0 20px rgba(46,204,113,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2ECC71"; e.currentTarget.style.boxShadow = "none"; }}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || itens.length === 0}
            >
              <Sparkles className="w-4 h-4" />
              {editingId ? "Atualizar Combo" : "Salvar Promoção"}
            </button>

            {editingId && (
              <Button variant="ghost" className="w-full mt-2" onClick={resetForm}>
                Cancelar Edição
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Saved combos */}
      {combosExistentes.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-bold">Combos Salvos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combosExistentes.map((combo) => {
              const m = combo.preco_venda > 0
                ? ((combo.preco_venda - combo.custo_total) / combo.preco_venda) * 100
                : 0;
              const mColor = m > 50 ? "text-success" : m >= 30 ? "text-warning" : "text-destructive";
              return (
                <div key={combo.id} className="card-premium">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-sm">{combo.nome}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editCombo(combo)}
                        className="p-1 hover:bg-secondary rounded transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(combo.id)}
                        className="p-1 hover:bg-destructive/10 rounded transition"
                      >
                        <Trash className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {combo.itens.length} ite{combo.itens.length !== 1 ? "ns" : "m"}
                  </p>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Custo:</span>
                    <span className="font-mono-data text-money">{fmt(combo.custo_total)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Venda:</span>
                    <span className="font-mono-data text-money">{fmt(combo.preco_venda)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Margem:</span>
                    <span className={`font-mono-data font-bold ${mColor}`}>{fmtPct(m)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Picker Dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Combo</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="pizzas" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="pizzas" className="flex-1">Pizzas</TabsTrigger>
              <TabsTrigger value="produtos" className="flex-1">Produtos</TabsTrigger>
              <TabsTrigger value="bebidas" className="flex-1">Bebidas</TabsTrigger>
            </TabsList>

            {/* Pizzas */}
            <TabsContent value="pizzas" className="space-y-2 mt-3">
              {fichasPizza.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma pizza cadastrada.
                </p>
              )}
              {fichasPizza.map((pizza) => (
                <div key={pizza.id} className="border border-border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">{pizza.nome}</p>
                  <div className="flex gap-2">
                    {(["p", "m", "g"] as const).map((size) => {
                      const custos = pizzaCustos[pizza.id];
                      const custo = custos?.[size] ?? 0;
                      return (
                        <button
                          key={size}
                          onClick={() => addPizza(pizza, size)}
                          className="flex-1 text-xs bg-secondary hover:bg-primary/20 hover:text-primary rounded py-2 px-1 transition text-center"
                        >
                          <span className="font-bold">{tamanhoLabel[size]}</span>
                          <br />
                          <span className="text-muted-foreground font-mono-data">
                            {fmt(custo)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Produtos */}
            <TabsContent value="produtos" className="space-y-2 mt-3">
              {fichasProduto.filter((f) => f.categoria !== "bebida").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum produto cadastrado.
                </p>
              )}
              {fichasProduto
                .filter((f) => f.categoria !== "bebida")
                .map((produto) => {
                  const custo = produtoCustoMap.get(produto.id) ?? 0;
                  return (
                    <button
                      key={produto.id}
                      onClick={() => addProduto(produto)}
                      className="w-full flex justify-between items-center border border-border rounded-lg p-3 hover:bg-primary/5 hover:border-primary/30 transition"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium">{produto.nome}</p>
                        <p className="text-xs text-muted-foreground capitalize">{categoriaLabel[produto.categoria] ?? produto.categoria}</p>
                      </div>
                      <span className="text-xs font-mono-data text-muted-foreground">
                        {fmt(custo)}
                      </span>
                    </button>
                  );
                })}
            </TabsContent>

            {/* Bebidas */}
            <TabsContent value="bebidas" className="space-y-2 mt-3">
              {bebidasIndustrializadas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma bebida cadastrada.
                </p>
              )}
              {bebidasIndustrializadas.map((bebida) => {
                const custo = Number(bebida.preco_pago) / Number(bebida.quantidade);
                return (
                  <button
                    key={bebida.id}
                    onClick={() => addBebida(bebida)}
                    className="w-full flex justify-between items-center border border-border rounded-lg p-3 hover:bg-primary/5 hover:border-primary/30 transition"
                  >
                    <p className="text-sm font-medium">{bebida.nome}</p>
                    <span className="text-xs font-mono-data text-muted-foreground">
                      {fmt(custo)}
                    </span>
                  </button>
                );
              })}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
