import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Trash2, Plus, ChevronLeft, ChevronRight, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { converterQuantidade } from "@/lib/pricing-helpers";
import { matchesSearch } from "@/lib/utils";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";

export type ProductType = "pizza" | "pastel" | "hamburguer" | "bebida_industrial" | "bebida_artesanal";

export const PRODUCT_TYPES: { key: ProductType; label: string; emoji: string; prefix: string }[] = [
  { key: "pizza", label: "Pizza", emoji: "🍕", prefix: "PZ" },
  { key: "pastel", label: "Pastel", emoji: "🥟", prefix: "PA" },
  { key: "hamburguer", label: "Hambúrguer", emoji: "🍔", prefix: "HA" },
  { key: "bebida_industrial", label: "Bebida Industrial", emoji: "🥤", prefix: "BI" },
  { key: "bebida_artesanal", label: "Bebida Artesanal", emoji: "🍹", prefix: "BA" },
];

interface IngredientForm {
  insumo_id: string;
  tipo_insumo: "comprado" | "proprio";
  nome: string;
  qtd_p: number;
  qtd_m: number;
  qtd_g: number;
  unidade: string;
  custo_unit: number;
}

interface WizardState {
  tipo: ProductType;
  nome: string;
  categoria: string;
  codigo: string;
  ingredientes: IngredientForm[];
  modo_preparo: string;
  bebida_insumo_id: string; // só p/ bebida_industrial
  bebida_custo: number;
  markup: number;
  taxa_ifood: number;
  taxa_cartao: number;
}

const emptyState = (tipo: ProductType): WizardState => ({
  tipo,
  nome: "",
  categoria: "",
  codigo: "",
  ingredientes: [],
  modo_preparo: "",
  bebida_insumo_id: "",
  bebida_custo: 0,
  markup: 80,
  taxa_ifood: 14,
  taxa_cartao: 3.5,
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialType?: ProductType;
  editingFicha?: { id: string; tipo: ProductType } | null;
}

export function FichaWizard({ open, onOpenChange, initialType = "pizza", editingFicha }: Props) {
  const qc = useQueryClient();
  const { activeUnidadeId } = useActiveUnidade();
  const [state, setState] = useState<WizardState>(emptyState(initialType));

  // Reset on open (only for create mode)
  useEffect(() => {
    if (open && !editingFicha) {
      setState(emptyState(initialType));
    }
  }, [open, initialType, editingFicha]);

  // Insumos
  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_comprados").select("*").order("nome");
      return data ?? [];
    },
  });
  const { data: insumosProprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data } = await supabase.from("insumos_proprios").select("*").order("nome");
      return data ?? [];
    },
  });

  const custoMap = useMemo(() => {
    const m = new Map<string, { custo: number; nome: string; unidade: string }>();
    insumosComprados.forEach((i: any) =>
      m.set(`comprado:${i.id}`, {
        custo: Number(i.preco_pago) / Number(i.quantidade),
        nome: i.nome,
        unidade: i.unidade === "kg" ? "g" : i.unidade === "L" ? "ml" : i.unidade,
      })
    );
    insumosProprios.forEach((i: any) =>
      m.set(`proprio:${i.id}`, {
        custo: Number(i.custo_kg ?? 0) / 1000, // por g
        nome: i.nome,
        unidade: i.unidade_rendimento === "kg" ? "g" : i.unidade_rendimento === "L" ? "ml" : i.unidade_rendimento,
      })
    );
    return m;
  }, [insumosComprados, insumosProprios]);

  // Load existing ficha when editing
  useEffect(() => {
    if (!open || !editingFicha || custoMap.size === 0) return;
    (async () => {
      if (editingFicha.tipo === "pizza") {
        const { data: ficha } = await supabase
          .from("fichas_tecnicas_pizza")
          .select("*")
          .eq("id", editingFicha.id)
          .single();
        const { data: ings } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .select("*")
          .eq("ficha_id", editingFicha.id);
        if (!ficha) return;
        const ingredientes: IngredientForm[] = (ings ?? []).map((r: any) => {
          const tipo = r.tipo_insumo as "comprado" | "proprio";
          const insumo_id = tipo === "comprado" ? r.insumo_comprado_id : r.insumo_proprio_id;
          const meta = custoMap.get(`${tipo}:${insumo_id}`);
          return {
            insumo_id,
            tipo_insumo: tipo,
            nome: meta?.nome ?? "(insumo removido)",
            unidade: meta?.unidade ?? r.unidade,
            custo_unit: meta?.custo ?? 0,
            qtd_p: Number(r.qtd_p ?? 0),
            qtd_m: Number(r.qtd_m ?? 0),
            qtd_g: Number(r.qtd_g ?? 0),
          };
        });
        setState({
          tipo: "pizza",
          nome: ficha.nome ?? "",
          categoria: ficha.tipo ?? "",
          codigo: ficha.numero_ficha ?? "",
          ingredientes,
          modo_preparo: ficha.modo_preparo ?? "",
          bebida_insumo_id: "",
          bebida_custo: 0,
          markup: 80,
          taxa_ifood: 14,
          taxa_cartao: 3.5,
        });
      } else {
        const { data: ficha } = await supabase
          .from("fichas_tecnicas_produtos")
          .select("*")
          .eq("id", editingFicha.id)
          .single();
        const { data: ings } = await supabase
          .from("fichas_tecnicas_produtos_ingredientes")
          .select("*")
          .eq("ficha_id", editingFicha.id);
        if (!ficha) return;
        const tipo = (ficha.categoria as ProductType) ?? editingFicha.tipo;
        const isBI = tipo === "bebida_industrial";
        let bebidaId = "";
        let bebidaCusto = 0;
        const ingredientes: IngredientForm[] = [];
        (ings ?? []).forEach((r: any) => {
          const ti = r.tipo_insumo as "comprado" | "proprio";
          const insumo_id = ti === "comprado" ? r.insumo_comprado_id : r.insumo_proprio_id;
          const meta = custoMap.get(`${ti}:${insumo_id}`);
          if (isBI) {
            bebidaId = insumo_id;
            bebidaCusto = meta?.custo ?? 0;
          } else {
            ingredientes.push({
              insumo_id,
              tipo_insumo: ti,
              nome: meta?.nome ?? "(insumo removido)",
              unidade: meta?.unidade ?? r.unidade,
              custo_unit: meta?.custo ?? 0,
              qtd_p: 0,
              qtd_m: Number(r.quantidade ?? 0),
              qtd_g: 0,
            });
          }
        });
        setState({
          tipo,
          nome: ficha.nome ?? "",
          categoria: "",
          codigo: ficha.numero_ficha ?? "",
          ingredientes,
          modo_preparo: ficha.modo_preparo ?? "",
          bebida_insumo_id: bebidaId,
          bebida_custo: bebidaCusto,
          markup: 80,
          taxa_ifood: 14,
          taxa_cartao: 3.5,
        });
      }
    })();
  }, [open, editingFicha, custoMap]);

  // Auto-generate code on type change (when not editing)
  useEffect(() => {
    if (editingFicha) return;
    const tp = PRODUCT_TYPES.find((p) => p.key === state.tipo);
    if (!tp) return;
    (async () => {
      const isPizza = state.tipo === "pizza";
      const table = isPizza ? "fichas_tecnicas_pizza" : "fichas_tecnicas_produtos";
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      const code = `${tp.prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;
      setState((s) => ({ ...s, codigo: code }));
    })();
  }, [state.tipo, editingFicha]);

  const isPizza = state.tipo === "pizza";
  const isBebidaInd = state.tipo === "bebida_industrial";

  // Cost calc
  const calcIngCost = (ing: IngredientForm, size: "p" | "m" | "g" | "single") => {
    const qtd = size === "single" ? ing.qtd_m : ing[`qtd_${size}` as "qtd_p" | "qtd_m" | "qtd_g"];
    return ing.custo_unit * converterQuantidade(qtd || 0, ing.unidade);
  };

  const custoP = state.ingredientes.reduce((a, i) => a + calcIngCost(i, "p"), 0);
  const custoM = state.ingredientes.reduce((a, i) => a + calcIngCost(i, "m"), 0);
  const custoG = state.ingredientes.reduce((a, i) => a + calcIngCost(i, "g"), 0);
  const custoSingle = isBebidaInd ? state.bebida_custo : state.ingredientes.reduce((a, i) => a + calcIngCost(i, "single"), 0);

  const calcPreco = (custo: number) => {
    const denom = 1 - state.taxa_ifood / 100 - state.taxa_cartao / 100;
    if (denom <= 0) return 0;
    return (custo * (1 + state.markup / 100)) / denom;
  };
  const calcMargem = (preco: number, custo: number) => (preco > 0 ? ((preco - custo) / preco) * 100 : 0);

  const margemBadge = (m: number) => {
    if (m >= 40) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (m >= 15) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  // Validation
  const canNext = () => {
    if (step === 1) return !!state.nome.trim();
    if (step === 2) {
      if (isBebidaInd) return !!state.bebida_insumo_id;
      return state.ingredientes.length > 0;
    }
    return true;
  };

  // Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeUnidadeId) throw new Error("Selecione uma unidade");
      const { data: auth } = await supabase.auth.getUser();
      const user_id = auth.user?.id;

      if (isPizza) {
        const payload = {
          nome: state.nome,
          tipo: state.categoria || "tradicional",
          numero_ficha: state.codigo,
          modo_preparo: state.modo_preparo || null,
          preco_venda_p: calcPreco(custoP),
          preco_venda_m: calcPreco(custoM),
          preco_venda_g: calcPreco(custoG),
        };
        let fichaId: string;
        if (editingFicha) {
          const { error } = await supabase
            .from("fichas_tecnicas_pizza")
            .update(payload)
            .eq("id", editingFicha.id);
          if (error) throw error;
          fichaId = editingFicha.id;
          await supabase.from("fichas_tecnicas_pizza_ingredientes").delete().eq("ficha_id", fichaId);
        } else {
          const { data: inserted, error } = await supabase
            .from("fichas_tecnicas_pizza")
            .insert({ ...payload, unidade_id: activeUnidadeId, user_id })
            .select()
            .single();
          if (error) throw error;
          fichaId = inserted.id;
        }
        if (state.ingredientes.length) {
          const rows = state.ingredientes.map((ing) => ({
            ficha_id: fichaId,
            tipo_insumo: ing.tipo_insumo,
            insumo_comprado_id: ing.tipo_insumo === "comprado" ? ing.insumo_id : null,
            insumo_proprio_id: ing.tipo_insumo === "proprio" ? ing.insumo_id : null,
            unidade: ing.unidade,
            qtd_p: ing.qtd_p,
            qtd_m: ing.qtd_m,
            qtd_g: ing.qtd_g,
            unidade_id: activeUnidadeId,
            user_id,
          }));
          const { error: e2 } = await supabase.from("fichas_tecnicas_pizza_ingredientes").insert(rows);
          if (e2) throw e2;
        }
      } else {
        const custo = isBebidaInd ? state.bebida_custo : custoSingle;
        const payload = {
          nome: state.nome,
          categoria: state.tipo,
          numero_ficha: state.codigo,
          modo_preparo: state.modo_preparo || null,
          preco_venda: calcPreco(custo),
        };
        let fichaId: string;
        if (editingFicha) {
          const { error } = await supabase
            .from("fichas_tecnicas_produtos")
            .update(payload)
            .eq("id", editingFicha.id);
          if (error) throw error;
          fichaId = editingFicha.id;
          await supabase.from("fichas_tecnicas_produtos_ingredientes").delete().eq("ficha_id", fichaId);
        } else {
          const { data: inserted, error } = await supabase
            .from("fichas_tecnicas_produtos")
            .insert({ ...payload, unidade_id: activeUnidadeId, user_id })
            .select()
            .single();
          if (error) throw error;
          fichaId = inserted.id;
        }

        if (isBebidaInd && state.bebida_insumo_id) {
          await supabase.from("fichas_tecnicas_produtos_ingredientes").insert({
            ficha_id: fichaId,
            tipo_insumo: "comprado",
            insumo_comprado_id: state.bebida_insumo_id,
            quantidade: 1,
            unidade: "unidade",
            unidade_id: activeUnidadeId,
            user_id,
          });
        } else if (state.ingredientes.length) {
          const rows = state.ingredientes.map((ing) => ({
            ficha_id: fichaId,
            tipo_insumo: ing.tipo_insumo,
            insumo_comprado_id: ing.tipo_insumo === "comprado" ? ing.insumo_id : null,
            insumo_proprio_id: ing.tipo_insumo === "proprio" ? ing.insumo_id : null,
            quantidade: ing.qtd_m,
            unidade: ing.unidade,
            unidade_id: activeUnidadeId,
            user_id,
          }));
          const { error: e2 } = await supabase.from("fichas_tecnicas_produtos_ingredientes").insert(rows);
          if (e2) throw e2;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos"] });
      qc.invalidateQueries({ queryKey: ["fichas_unificadas"] });
      toast.success(editingFicha ? "Ficha atualizada!" : "Ficha técnica salva!");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const canSave = !!state.nome.trim() && (isBebidaInd ? !!state.bebida_insumo_id : state.ingredientes.length > 0);
  const headerTitle = `${editingFicha ? "Editar" : "Nova"} Ficha Técnica`;

  const updateIng = (idx: number, field: string, value: number) => {
    setState((s) => {
      const ings = [...s.ingredientes];
      ings[idx] = { ...ings[idx], [field]: value };
      return { ...s, ingredientes: ings };
    });
  };
  const removeIng = (idx: number) =>
    setState((s) => ({ ...s, ingredientes: s.ingredientes.filter((_, i) => i !== idx) }));
  const addIng = (ing: IngredientForm) =>
    setState((s) => ({ ...s, ingredientes: [...s.ingredientes, ing] }));

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground mt-4 mb-2 first:mt-0">
      {children}
    </h3>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{headerTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {/* ── Identificação ─────────────────────────────────────── */}
          <SectionTitle>Identificação</SectionTitle>
          <div>
            <Label className="mb-2 block">Tipo de produto</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setState((s) => ({ ...s, tipo: t.key }))}
                  disabled={!!editingFicha}
                  className={`border rounded-lg p-2 text-center transition-all ${
                    state.tipo === t.key
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-xl mb-0.5">{t.emoji}</div>
                  <div className="text-xs font-semibold">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label>Nome do produto *</Label>
              <Input
                value={state.nome}
                onChange={(e) => setState((s) => ({ ...s, nome: e.target.value }))}
                placeholder="Ex: Pizza Calabresa"
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={state.codigo}
                onChange={(e) => setState((s) => ({ ...s, codigo: e.target.value }))}
                placeholder="Auto"
              />
            </div>
          </div>
          {isPizza && (
            <div>
              <Label>Categoria</Label>
              <Input
                value={state.categoria}
                onChange={(e) => setState((s) => ({ ...s, categoria: e.target.value }))}
                placeholder="tradicional, especial, doce..."
              />
            </div>
          )}

          {/* ── Ingredientes ──────────────────────────────────────── */}
          <SectionTitle>
            {isBebidaInd ? "Bebida" : isPizza ? "Ingredientes (P / M / G)" : "Ingredientes"}
          </SectionTitle>
          {isBebidaInd ? (
            <BebidaIndustrialForm
              insumos={insumosComprados as any}
              value={state.bebida_insumo_id}
              onChange={(id: string, custo: number) =>
                setState((s) => ({ ...s, bebida_insumo_id: id, bebida_custo: custo }))
              }
            />
          ) : isPizza ? (
            <PizzaIngredientesTable
              ingredientes={state.ingredientes}
              onChange={updateIng}
              onRemove={removeIng}
              calcIngCost={calcIngCost}
              custoP={custoP}
              custoM={custoM}
              custoG={custoG}
            />
          ) : (
            <SimpleIngredientesTable
              ingredientes={state.ingredientes}
              onChange={updateIng}
              onRemove={removeIng}
              calcIngCost={calcIngCost}
              custoTotal={custoSingle}
            />
          )}
          {!isBebidaInd && (
            <IngredientPicker
              insumosComprados={insumosComprados}
              insumosProprios={insumosProprios}
              custoMap={custoMap}
              onAdd={addIng}
            />
          )}
          {!isBebidaInd && (
            <p className="text-xs text-muted-foreground">
              💡 Embalagens (caixa, copo, sacola) também são insumos — adicione aqui como ingredientes.
            </p>
          )}

          {/* ── Modo de preparo ───────────────────────────────────── */}
          <SectionTitle>Modo de preparo (opcional)</SectionTitle>
          <Textarea
            value={state.modo_preparo}
            onChange={(e) => setState((s) => ({ ...s, modo_preparo: e.target.value }))}
            placeholder="Descreva o modo de preparo..."
            rows={3}
          />

          {/* ── Precificação ──────────────────────────────────────── */}
          <SectionTitle>Precificação</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Taxa iFood</Label>
              <Select value={String(state.taxa_ifood)} onValueChange={(v) => setState((s) => ({ ...s, taxa_ifood: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 12, 14, 23, 27].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Taxa cartão</Label>
              <Select value={String(state.taxa_cartao)} onValueChange={(v) => setState((s) => ({ ...s, taxa_cartao: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1.35, 2.5, 3.5, 4.5].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-1">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span>Markup desejado</span>
              <span className="text-primary">{state.markup}%</span>
            </div>
            <Slider
              value={[state.markup]}
              onValueChange={([v]) => setState((s) => ({ ...s, markup: v }))}
              min={0}
              max={200}
              step={5}
            />
          </div>
          {isPizza ? (
            <div className="grid grid-cols-3 gap-2 pt-2">
              {(["P", "M", "G"] as const).map((sz) => {
                const c = sz === "P" ? custoP : sz === "M" ? custoM : custoG;
                const p = calcPreco(c);
                const m = calcMargem(p, c);
                return (
                  <PrecoCard key={sz} title={sz} custo={c} preco={p} margem={m} badgeClass={margemBadge(m)} />
                );
              })}
            </div>
          ) : (
            (() => {
              const c = custoSingle;
              const p = calcPreco(c);
              const m = calcMargem(p, c);
              return <PrecoCard large custo={c} preco={p} margem={m} badgeClass={margemBadge(m)} />;
            })()
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t sticky bottom-0 bg-background">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            <ChevronLeft size={16} /> Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            <Save size={16} /> {saveMutation.isPending ? "Salvando..." : "Salvar Ficha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function PrecoCard({ title, custo, preco, margem, badgeClass, large }: { title?: string; custo: number; preco: number; margem: number; badgeClass: string; large?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      {title && <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-bold">Tamanho {title}</div>}
      <div className="text-xs text-muted-foreground">Custo</div>
      <div className="text-sm font-mono mb-2">{formatCurrency(custo)}</div>
      <div className="text-xs text-muted-foreground">Preço sugerido</div>
      <div className={`font-display font-bold ${large ? "text-3xl" : "text-xl"} text-primary tabular-nums`}>
        {formatCurrency(preco)}
      </div>
      <div className="text-xs text-muted-foreground mt-2">Lucro: <span className="font-semibold text-foreground">{formatCurrency(preco - custo)}</span></div>
      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border font-semibold ${badgeClass}`}>
        Margem {margem.toFixed(1)}%
      </span>
    </div>
  );
}

function BebidaIndustrialForm({ insumos, value, onChange }: any) {
  const bebidas = insumos.filter((i: any) => i.categoria?.toLowerCase().includes("bebida"));
  return (
    <div className="space-y-3">
      <Label>Selecione a bebida (insumo já cadastrado)</Label>
      <Select
        value={value}
        onValueChange={(id) => {
          const ins = insumos.find((i: any) => i.id === id);
          if (ins) onChange(id, Number(ins.preco_pago) / Number(ins.quantidade));
        }}
      >
        <SelectTrigger><SelectValue placeholder="Escolha a bebida..." /></SelectTrigger>
        <SelectContent>
          {bebidas.length === 0 && <SelectItem value="_" disabled>Nenhuma bebida cadastrada</SelectItem>}
          {bebidas.map((b: any) => (
            <SelectItem key={b.id} value={b.id}>
              {b.nome} — {formatCurrency(Number(b.preco_pago) / Number(b.quantidade))}/un
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Para bebidas industriais, o custo vem direto do insumo comprado. Sem receita.
      </p>
    </div>
  );
}

function IngredientCard({ ing, idx, size, onChange, onRemove, custo }: any) {
  const sizeKey = size === "single" ? "qtd_m" : `qtd_${size}`;
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{ing.nome}</span>
        <Button size="icon" variant="ghost" onClick={() => onRemove(idx)} className="h-7 w-7">
          <Trash2 size={14} />
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Input
          type="number"
          step="0.01"
          value={ing[sizeKey] || ""}
          onChange={(e) => onChange(idx, sizeKey, parseFloat(e.target.value) || 0)}
          className="w-24 h-9"
          placeholder="Qtd"
        />
        <span className="text-muted-foreground text-xs">{ing.unidade}</span>
        <span className="text-muted-foreground text-xs ml-auto">
          {formatCurrency(ing.custo_unit)}/{ing.unidade}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">= {formatCurrency(custo)}</span>
      </div>
    </div>
  );
}

function IngredientPicker({ insumosComprados, insumosProprios, custoMap, onAdd }: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const all: any[] = [
      ...insumosComprados.map((i: any) => ({ ...i, _tipo: "comprado" })),
      ...insumosProprios.map((i: any) => ({ ...i, _tipo: "proprio" })),
    ];
    const filtered = all.filter((i) =>
      matchesSearch(i.nome, search) || (i.categoria && matchesSearch(i.categoria, search))
    );
    // Sem busca: limita a 50 pra performance. Com busca: mostra TODOS os resultados.
    return search.trim().length === 0 ? filtered.slice(0, 50) : filtered;
  }, [insumosComprados, insumosProprios, search]);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus size={16} /> Adicionar Ingrediente
      </Button>
    );
  }
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <Input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar insumo..."
      />
      <div className="max-h-48 overflow-y-auto space-y-1">
        {list.map((i: any) => {
          const key = `${i._tipo}:${i.id}`;
          const meta = custoMap.get(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (!meta) return;
                onAdd({
                  insumo_id: i.id,
                  tipo_insumo: i._tipo,
                  nome: meta.nome,
                  unidade: meta.unidade,
                  custo_unit: meta.custo,
                  qtd_p: 0, qtd_m: 0, qtd_g: 0,
                });
                setOpen(false);
                setSearch("");
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-primary/10 flex items-center justify-between gap-2"
            >
              <span className="truncate">{i.nome}</span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
                  i._tipo === "proprio"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {i._tipo === "proprio" ? "Produzido" : "Comprado"}
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted-foreground p-2">Nenhum insumo encontrado.</p>}
      </div>
      <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setSearch(""); }}>Cancelar</Button>
    </div>
  );
}

function PizzaIngredientes({ state, setState, custoMap, insumosComprados, insumosProprios, calcIngCost, custoP, custoM, custoG }: any) {
  const [tab, setTab] = useState<"P" | "M" | "G">("M");
  const sizeKey = tab.toLowerCase() as "p" | "m" | "g";
  const total = tab === "P" ? custoP : tab === "M" ? custoM : custoG;

  const updateIng = (idx: number, field: string, value: number) => {
    const ings = [...state.ingredientes];
    ings[idx] = { ...ings[idx], [field]: value };
    setState({ ...state, ingredientes: ings });
  };
  const remove = (idx: number) => setState({ ...state, ingredientes: state.ingredientes.filter((_: any, i: number) => i !== idx) });
  const add = (ing: any) => setState({ ...state, ingredientes: [...state.ingredientes, ing] });

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="P">Tamanho P</TabsTrigger>
          <TabsTrigger value="M">Tamanho M</TabsTrigger>
          <TabsTrigger value="G">Tamanho G</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-2">
        {state.ingredientes.map((ing: any, i: number) => (
          <IngredientCard
            key={i}
            ing={ing}
            idx={i}
            size={sizeKey}
            onChange={updateIng}
            onRemove={remove}
            custo={calcIngCost(ing, sizeKey)}
          />
        ))}
        <IngredientPicker
          insumosComprados={insumosComprados}
          insumosProprios={insumosProprios}
          custoMap={custoMap}
          onAdd={add}
        />
      </div>
      <div className="flex justify-between items-center bg-primary/5 rounded-lg p-3 border border-primary/20">
        <span className="text-sm font-semibold">Custo acumulado ({tab})</span>
        <span className="font-display font-bold text-lg text-primary tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function SimpleIngredientes({ state, setState, custoMap, insumosComprados, insumosProprios, calcIngCost, custoTotal }: any) {
  const updateIng = (idx: number, field: string, value: number) => {
    const ings = [...state.ingredientes];
    ings[idx] = { ...ings[idx], [field]: value };
    setState({ ...state, ingredientes: ings });
  };
  const remove = (idx: number) => setState({ ...state, ingredientes: state.ingredientes.filter((_: any, i: number) => i !== idx) });
  const add = (ing: any) => setState({ ...state, ingredientes: [...state.ingredientes, ing] });

  return (
    <div className="space-y-3">
      {state.ingredientes.map((ing: any, i: number) => (
        <IngredientCard
          key={i}
          ing={ing}
          idx={i}
          size="single"
          onChange={updateIng}
          onRemove={remove}
          custo={calcIngCost(ing, "single")}
        />
      ))}
      <IngredientPicker
        insumosComprados={insumosComprados}
        insumosProprios={insumosProprios}
        custoMap={custoMap}
        onAdd={add}
      />
      <div className="flex justify-between items-center bg-primary/5 rounded-lg p-3 border border-primary/20">
        <span className="text-sm font-semibold">Custo acumulado</span>
        <span className="font-display font-bold text-lg text-primary tabular-nums">{formatCurrency(custoTotal)}</span>
      </div>
    </div>
  );
}
