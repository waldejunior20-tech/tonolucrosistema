import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  ChevronDown,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { converterQuantidade } from "@/lib/pricing-helpers";
import { matchesSearch } from "@/lib/utils";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";
import { PRODUCT_TYPES, type ProductType } from "@/components/fichas/FichaWizard";

// ─── Types ────────────────────────────────────────────────────────────
interface IngredientForm {
  insumo_id: string;
  tipo_insumo: "comprado" | "proprio";
  nome: string;
  qtd_p: number;
  qtd_m: number;
  qtd_g: number;
  unidade: string;
  custo_unit: number; // por g/ml/un
}

interface EmbalagemSlot {
  insumo_id: string;
  nome: string;
  custo_unit: number; // por unidade
}

const isEmbalagem = (categoria?: string | null) =>
  !!categoria && /embal/i.test(categoria);

// ─── Page ─────────────────────────────────────────────────────────────
export default function FichaTecnicaEditor() {
  const { tipo: tipoParam, id: idParam } = useParams<{ tipo: string; id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { activeUnidadeId } = useActiveUnidade();

  const tipo = (tipoParam ?? "pizza") as ProductType;
  const isNew = idParam === "new";
  const isPizza = tipo === "pizza";
  const isBebidaInd = tipo === "bebida_industrial";
  const tipoMeta = PRODUCT_TYPES.find((t) => t.key === tipo)!;

  // ── Form state ────────────────────────────────────────────────────
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [codigo, setCodigo] = useState("");
  const [modoPreparo, setModoPreparo] = useState("");
  const [ingredientes, setIngredientes] = useState<IngredientForm[]>([]);
  const [embalagens, setEmbalagens] = useState<{
    p: EmbalagemSlot | null;
    m: EmbalagemSlot | null;
    g: EmbalagemSlot | null;
    unico: EmbalagemSlot | null;
  }>({ p: null, m: null, g: null, unico: null });
  const [bebidaInsumoId, setBebidaInsumoId] = useState("");
  const [bebidaCusto, setBebidaCusto] = useState(0);
  const [taxaIfood, setTaxaIfood] = useState(14);
  const [taxaCartao, setTaxaCartao] = useState(3.5);
  const [markup, setMarkup] = useState(80);

  // ── Insumos ───────────────────────────────────────────────────────
  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insumos_comprados")
        .select("*")
        .order("nome");
      return data ?? [];
    },
  });
  const { data: insumosProprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data } = await supabase
        .from("insumos_proprios")
        .select("*")
        .order("nome");
      return data ?? [];
    },
  });

  const custoMap = useMemo(() => {
    const m = new Map<
      string,
      { custo: number; nome: string; unidade: string; categoria?: string }
    >();
    insumosComprados.forEach((i: any) =>
      m.set(`comprado:${i.id}`, {
        custo: Number(i.preco_pago) / Number(i.quantidade),
        nome: i.nome,
        unidade:
          i.unidade === "kg" ? "g" : i.unidade === "L" ? "ml" : i.unidade,
        categoria: i.categoria,
      }),
    );
    insumosProprios.forEach((i: any) =>
      m.set(`proprio:${i.id}`, {
        custo: Number(i.custo_kg ?? 0) / 1000,
        nome: i.nome,
        unidade:
          i.unidade_rendimento === "kg"
            ? "g"
            : i.unidade_rendimento === "L"
              ? "ml"
              : i.unidade_rendimento,
      }),
    );
    return m;
  }, [insumosComprados, insumosProprios]);

  const embalagensDisponiveis = useMemo(
    () =>
      (insumosComprados as any[]).filter((i) => isEmbalagem(i.categoria)),
    [insumosComprados],
  );

  // ── Auto-código (nova ficha) ─────────────────────────────────────
  useEffect(() => {
    if (!isNew) return;
    (async () => {
      const table = isPizza ? "fichas_tecnicas_pizza" : "fichas_tecnicas_produtos";
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      setCodigo(`${tipoMeta.prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`);
    })();
  }, [isNew, isPizza, tipoMeta.prefix]);

  // ── Load existing ────────────────────────────────────────────────
  useEffect(() => {
    if (isNew || !idParam || custoMap.size === 0) return;
    (async () => {
      if (isPizza) {
        const { data: ficha } = await supabase
          .from("fichas_tecnicas_pizza")
          .select("*")
          .eq("id", idParam)
          .single();
        const { data: ings } = await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .select("*")
          .eq("ficha_id", idParam);
        if (!ficha) return;

        const novosIng: IngredientForm[] = [];
        const novasEmb: typeof embalagens = { p: null, m: null, g: null, unico: null };
        (ings ?? []).forEach((r: any) => {
          const ti = r.tipo_insumo as "comprado" | "proprio";
          const insumoId = ti === "comprado" ? r.insumo_comprado_id : r.insumo_proprio_id;
          const meta = custoMap.get(`${ti}:${insumoId}`);
          const slot: EmbalagemSlot = {
            insumo_id: insumoId,
            nome: meta?.nome ?? "(removido)",
            custo_unit: meta?.custo ?? 0,
          };
          if (ti === "comprado" && isEmbalagem(meta?.categoria)) {
            if (Number(r.qtd_p) > 0) novasEmb.p = slot;
            if (Number(r.qtd_m) > 0) novasEmb.m = slot;
            if (Number(r.qtd_g) > 0) novasEmb.g = slot;
            return;
          }
          novosIng.push({
            insumo_id: insumoId,
            tipo_insumo: ti,
            nome: meta?.nome ?? "(removido)",
            unidade: meta?.unidade ?? r.unidade,
            custo_unit: meta?.custo ?? 0,
            qtd_p: Number(r.qtd_p ?? 0),
            qtd_m: Number(r.qtd_m ?? 0),
            qtd_g: Number(r.qtd_g ?? 0),
          });
        });
        setNome(ficha.nome ?? "");
        setCategoria(ficha.tipo ?? "");
        setCodigo(ficha.numero_ficha ?? "");
        setModoPreparo(ficha.modo_preparo ?? "");
        setIngredientes(novosIng);
        setEmbalagens(novasEmb);
      } else {
        const { data: ficha } = await supabase
          .from("fichas_tecnicas_produtos")
          .select("*")
          .eq("id", idParam)
          .single();
        const { data: ings } = await supabase
          .from("fichas_tecnicas_produtos_ingredientes")
          .select("*")
          .eq("ficha_id", idParam);
        if (!ficha) return;

        const novosIng: IngredientForm[] = [];
        let novaEmbUnico: EmbalagemSlot | null = null;
        let bid = "", bc = 0;
        (ings ?? []).forEach((r: any) => {
          const ti = r.tipo_insumo as "comprado" | "proprio";
          const insumoId = ti === "comprado" ? r.insumo_comprado_id : r.insumo_proprio_id;
          const meta = custoMap.get(`${ti}:${insumoId}`);
          if (isBebidaInd) {
            bid = insumoId;
            bc = meta?.custo ?? 0;
            return;
          }
          if (ti === "comprado" && isEmbalagem(meta?.categoria)) {
            novaEmbUnico = {
              insumo_id: insumoId,
              nome: meta?.nome ?? "(removido)",
              custo_unit: meta?.custo ?? 0,
            };
            return;
          }
          novosIng.push({
            insumo_id: insumoId,
            tipo_insumo: ti,
            nome: meta?.nome ?? "(removido)",
            unidade: meta?.unidade ?? r.unidade,
            custo_unit: meta?.custo ?? 0,
            qtd_p: 0,
            qtd_m: Number(r.quantidade ?? 0),
            qtd_g: 0,
          });
        });
        setNome(ficha.nome ?? "");
        setCodigo(ficha.numero_ficha ?? "");
        setModoPreparo(ficha.modo_preparo ?? "");
        setIngredientes(novosIng);
        setEmbalagens((s) => ({ ...s, unico: novaEmbUnico }));
        setBebidaInsumoId(bid);
        setBebidaCusto(bc);
      }
    })();
  }, [isNew, idParam, custoMap, isPizza, isBebidaInd]);

  // ── Cálculos ─────────────────────────────────────────────────────
  const custoIng = (ing: IngredientForm, size: "p" | "m" | "g" | "single") => {
    const qtd = size === "single" ? ing.qtd_m : ing[`qtd_${size}` as const];
    return ing.custo_unit * converterQuantidade(qtd || 0, ing.unidade);
  };

  const mpP = ingredientes.reduce((a, i) => a + custoIng(i, "p"), 0);
  const mpM = ingredientes.reduce((a, i) => a + custoIng(i, "m"), 0);
  const mpG = ingredientes.reduce((a, i) => a + custoIng(i, "g"), 0);
  const mpUnico = isBebidaInd
    ? bebidaCusto
    : ingredientes.reduce((a, i) => a + custoIng(i, "single"), 0);

  const embP = embalagens.p?.custo_unit ?? 0;
  const embM = embalagens.m?.custo_unit ?? 0;
  const embG = embalagens.g?.custo_unit ?? 0;
  const embU = embalagens.unico?.custo_unit ?? 0;

  const custoP = mpP + embP;
  const custoM = mpM + embM;
  const custoG = mpG + embG;
  const custoUnico = mpUnico + embU;

  const calcPreco = (custo: number) => {
    const denom = 1 - taxaIfood / 100 - taxaCartao / 100;
    if (denom <= 0) return 0;
    return (custo * (1 + markup / 100)) / denom;
  };
  const margem = (preco: number, custo: number) =>
    preco > 0 ? ((preco - custo) / preco) * 100 : 0;

  const margemBadge = (m: number) => {
    if (m >= 40) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (m >= 15) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  // ── Mutations ────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeUnidadeId) throw new Error("Selecione uma unidade");
      const { data: auth } = await supabase.auth.getUser();
      const user_id = auth.user?.id;

      if (isPizza) {
        const payload = {
          nome,
          tipo: categoria || "tradicional",
          numero_ficha: codigo,
          modo_preparo: modoPreparo || null,
          preco_venda_p: calcPreco(custoP),
          preco_venda_m: calcPreco(custoM),
          preco_venda_g: calcPreco(custoG),
        };
        let fichaId = idParam!;
        if (isNew) {
          const { data: ins, error } = await supabase
            .from("fichas_tecnicas_pizza")
            .insert({ ...payload, unidade_id: activeUnidadeId, user_id })
            .select()
            .single();
          if (error) throw error;
          fichaId = ins.id;
        } else {
          const { error } = await supabase
            .from("fichas_tecnicas_pizza")
            .update(payload)
            .eq("id", fichaId);
          if (error) throw error;
          await supabase
            .from("fichas_tecnicas_pizza_ingredientes")
            .delete()
            .eq("ficha_id", fichaId);
        }

        const rows: any[] = ingredientes.map((ing) => ({
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
        // Embalagens (cada tamanho como linha separada qtd=1 só na coluna do tamanho)
        (["p", "m", "g"] as const).forEach((sz) => {
          const e = embalagens[sz];
          if (!e) return;
          rows.push({
            ficha_id: fichaId,
            tipo_insumo: "comprado",
            insumo_comprado_id: e.insumo_id,
            insumo_proprio_id: null,
            unidade: "unidade",
            qtd_p: sz === "p" ? 1 : 0,
            qtd_m: sz === "m" ? 1 : 0,
            qtd_g: sz === "g" ? 1 : 0,
            unidade_id: activeUnidadeId,
            user_id,
          });
        });
        if (rows.length) {
          const { error } = await supabase
            .from("fichas_tecnicas_pizza_ingredientes")
            .insert(rows);
          if (error) throw error;
        }
      } else {
        const custo = isBebidaInd ? bebidaCusto + embU : custoUnico;
        const payload = {
          nome,
          categoria: tipo,
          numero_ficha: codigo,
          modo_preparo: modoPreparo || null,
          preco_venda: calcPreco(custo),
        };
        let fichaId = idParam!;
        if (isNew) {
          const { data: ins, error } = await supabase
            .from("fichas_tecnicas_produtos")
            .insert({ ...payload, unidade_id: activeUnidadeId, user_id })
            .select()
            .single();
          if (error) throw error;
          fichaId = ins.id;
        } else {
          const { error } = await supabase
            .from("fichas_tecnicas_produtos")
            .update(payload)
            .eq("id", fichaId);
          if (error) throw error;
          await supabase
            .from("fichas_tecnicas_produtos_ingredientes")
            .delete()
            .eq("ficha_id", fichaId);
        }

        const rows: any[] = [];
        if (isBebidaInd && bebidaInsumoId) {
          rows.push({
            ficha_id: fichaId,
            tipo_insumo: "comprado",
            insumo_comprado_id: bebidaInsumoId,
            quantidade: 1,
            unidade: "unidade",
            unidade_id: activeUnidadeId,
            user_id,
          });
        } else {
          ingredientes.forEach((ing) =>
            rows.push({
              ficha_id: fichaId,
              tipo_insumo: ing.tipo_insumo,
              insumo_comprado_id:
                ing.tipo_insumo === "comprado" ? ing.insumo_id : null,
              insumo_proprio_id:
                ing.tipo_insumo === "proprio" ? ing.insumo_id : null,
              quantidade: ing.qtd_m,
              unidade: ing.unidade,
              unidade_id: activeUnidadeId,
              user_id,
            }),
          );
        }
        if (embalagens.unico) {
          rows.push({
            ficha_id: fichaId,
            tipo_insumo: "comprado",
            insumo_comprado_id: embalagens.unico.insumo_id,
            quantidade: 1,
            unidade: "unidade",
            unidade_id: activeUnidadeId,
            user_id,
          });
        }
        if (rows.length) {
          const { error } = await supabase
            .from("fichas_tecnicas_produtos_ingredientes")
            .insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos"] });
      qc.invalidateQueries({ queryKey: ["fichas_unificadas"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos", "all-rows"] });
      toast.success(isNew ? "Ficha criada!" : "Ficha atualizada!");
      navigate(`/fichas?tab=${tipo}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isNew) return;
      if (isPizza) {
        await supabase
          .from("fichas_tecnicas_pizza_ingredientes")
          .delete()
          .eq("ficha_id", idParam!);
        await supabase.from("fichas_tecnicas_pizza").delete().eq("id", idParam!);
      } else {
        await supabase
          .from("fichas_tecnicas_produtos_ingredientes")
          .delete()
          .eq("ficha_id", idParam!);
        await supabase
          .from("fichas_tecnicas_produtos")
          .delete()
          .eq("id", idParam!);
      }
    },
    onSuccess: () => {
      toast.success("Ficha excluída");
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos"] });
      navigate(`/fichas?tab=${tipo}`);
    },
  });

  const canSave =
    !!nome.trim() &&
    (isBebidaInd ? !!bebidaInsumoId : ingredientes.length > 0);

  // ── Helpers UI ───────────────────────────────────────────────────
  const updateIng = (idx: number, field: keyof IngredientForm, value: number) =>
    setIngredientes((arr) => {
      const out = [...arr];
      (out[idx] as any)[field] = value;
      return out;
    });
  const removeIng = (idx: number) =>
    setIngredientes((arr) => arr.filter((_, i) => i !== idx));
  const addIng = (ing: IngredientForm) =>
    setIngredientes((arr) => [...arr, ing]);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 page-enter pb-20">
      {/* HEADER */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/fichas?tab=${tipo}`)}>
          <ArrowLeft size={16} /> Voltar
        </Button>
        <div className="flex-1 min-w-[260px]">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={`Nome da ${tipoMeta.label.toLowerCase()}...`}
            className="text-lg font-display font-bold h-12"
          />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span>{tipoMeta.emoji} {tipoMeta.label}</span>
          <span className="font-mono">{codigo}</span>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!canSave || saveMutation.isPending}
          className="gap-2"
        >
          <Save size={16} /> {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        {!isNew && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm(`Excluir ficha "${nome}"?`)) deleteMutation.mutate();
            }}
          >
            <Trash2 size={16} className="text-destructive" />
          </Button>
        )}
      </div>

      {/* GRID: conteúdo + painel sticky */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* TAMANHO CARDS */}
          {isPizza ? (
            <div className="grid grid-cols-3 gap-3">
              <TamanhoCard label="P" sublabel="25cm" custo={custoP} qtd={ingredientes.filter((i) => i.qtd_p > 0).length} />
              <TamanhoCard label="M" sublabel="30cm" custo={custoM} qtd={ingredientes.filter((i) => i.qtd_m > 0).length} />
              <TamanhoCard label="G" sublabel="35cm" custo={custoG} qtd={ingredientes.filter((i) => i.qtd_g > 0).length} />
            </div>
          ) : (
            <TamanhoCard
              label="Custo Unitário"
              custo={custoUnico}
              qtd={isBebidaInd ? (bebidaInsumoId ? 1 : 0) : ingredientes.length}
              large
            />
          )}

          {/* IDENTIFICAÇÃO EXTRA */}
          {isPizza && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Input
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="tradicional, especial, doce..."
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              </div>
            </div>
          )}

          {/* BEBIDA INDUSTRIAL */}
          {isBebidaInd ? (
            <Section title="Bebida">
              <Select
                value={bebidaInsumoId}
                onValueChange={(id) => {
                  const ins: any = (insumosComprados as any[]).find((i) => i.id === id);
                  if (ins) {
                    setBebidaInsumoId(id);
                    setBebidaCusto(Number(ins.preco_pago) / Number(ins.quantidade));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a bebida..." />
                </SelectTrigger>
                <SelectContent>
                  {(insumosComprados as any[])
                    .filter((i) => i.categoria?.toLowerCase().includes("bebida"))
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome} — {formatCurrency(Number(b.preco_pago) / Number(b.quantidade))}/un
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Section>
          ) : (
            <Section title={`Composição${isPizza ? " (P / M / G)" : ""}`}>
              {isPizza ? (
                <PizzaTable
                  ingredientes={ingredientes}
                  onChange={updateIng}
                  onRemove={removeIng}
                  custoIng={custoIng}
                />
              ) : (
                <SimpleTable
                  ingredientes={ingredientes}
                  onChange={updateIng}
                  onRemove={removeIng}
                  custoIng={custoIng}
                />
              )}
              <IngredientPicker
                insumosComprados={insumosComprados}
                insumosProprios={insumosProprios}
                custoMap={custoMap}
                onAdd={addIng}
              />
            </Section>
          )}

          {/* EMBALAGENS */}
          <Section title="Embalagens" icon={<Package size={14} />}>
            {embalagensDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum insumo de categoria "Embalagem" cadastrado.{" "}
                <a href="/insumos/comprados" className="text-primary underline">
                  Cadastrar
                </a>
              </p>
            ) : isPizza ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["p", "m", "g"] as const).map((sz) => (
                  <EmbalagemSelect
                    key={sz}
                    label={sz.toUpperCase()}
                    value={embalagens[sz]?.insumo_id ?? ""}
                    options={embalagensDisponiveis}
                    onChange={(slot) => setEmbalagens((s) => ({ ...s, [sz]: slot }))}
                  />
                ))}
              </div>
            ) : (
              <EmbalagemSelect
                label="Embalagem"
                value={embalagens.unico?.insumo_id ?? ""}
                options={embalagensDisponiveis}
                onChange={(slot) => setEmbalagens((s) => ({ ...s, unico: slot }))}
              />
            )}
          </Section>

          {/* MODO DE PREPARO (colapsável) */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground transition">
              <ChevronDown size={14} className="transition-transform data-[state=open]:rotate-180" />
              Modo de Preparo (opcional)
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <Textarea
                value={modoPreparo}
                onChange={(e) => setModoPreparo(e.target.value)}
                rows={4}
                placeholder="Descreva o passo a passo..."
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* PAINEL PRECIFICAÇÃO STICKY */}
        <aside className="lg:sticky lg:top-4 lg:self-start space-y-4">
          {isPizza ? (
            <>
              <PrecoCard label="P" custo={custoP} mp={mpP} emb={embP} preco={calcPreco(custoP)} margemBadge={margemBadge} margem={margem(calcPreco(custoP), custoP)} />
              <PrecoCard label="M" custo={custoM} mp={mpM} emb={embM} preco={calcPreco(custoM)} margemBadge={margemBadge} margem={margem(calcPreco(custoM), custoM)} />
              <PrecoCard label="G" custo={custoG} mp={mpG} emb={embG} preco={calcPreco(custoG)} margemBadge={margemBadge} margem={margem(calcPreco(custoG), custoG)} />
            </>
          ) : (
            <PrecoCard
              custo={custoUnico}
              mp={mpUnico}
              emb={embU}
              preco={calcPreco(custoUnico)}
              margemBadge={margemBadge}
              margem={margem(calcPreco(custoUnico), custoUnico)}
              large
            />
          )}

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div>
              <Label className="text-xs">Taxa iFood</Label>
              <Select value={String(taxaIfood)} onValueChange={(v) => setTaxaIfood(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 12, 14, 23, 27].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Taxa cartão</Label>
              <Select value={String(taxaCartao)} onValueChange={(v) => setTaxaCartao(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1.35, 2.5, 3.5, 4.5].map((v) => (
                    <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Markup</span>
                <span className="text-primary">{markup}%</span>
              </div>
              <Slider
                value={[markup]}
                onValueChange={([v]) => setMarkup(v)}
                min={0}
                max={200}
                step={5}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function TamanhoCard({
  label,
  sublabel,
  custo,
  qtd,
  large,
}: {
  label: string;
  sublabel?: string;
  custo: number;
  qtd: number;
  large?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="font-display font-bold text-lg">{label}</div>
          {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
        </div>
        <div className="text-xs text-muted-foreground">{qtd} {qtd === 1 ? "item" : "itens"}</div>
      </div>
      <div className={`font-mono tabular-nums font-bold text-primary mt-1 ${large ? "text-3xl" : "text-2xl"}`}>
        {formatCurrency(custo)}
      </div>
    </div>
  );
}

function PrecoCard({
  label,
  custo,
  mp,
  emb,
  preco,
  margem,
  margemBadge,
  large,
}: {
  label?: string;
  custo: number;
  mp: number;
  emb: number;
  preco: number;
  margem: number;
  margemBadge: (m: number) => string;
  large?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      {label && (
        <div className="text-xs uppercase font-bold tracking-wide text-muted-foreground mb-2">
          Tamanho {label}
        </div>
      )}
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between"><span className="text-muted-foreground">Matéria-prima</span><span className="font-mono tabular-nums">{formatCurrency(mp)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Embalagem</span><span className="font-mono tabular-nums">{formatCurrency(emb)}</span></div>
        <div className="flex justify-between border-t pt-1 mt-1 font-semibold"><span>Custo real</span><span className="font-mono tabular-nums">{formatCurrency(custo)}</span></div>
      </div>
      <div className="mt-3">
        <div className="text-xs text-muted-foreground">Preço sugerido</div>
        <div className={`font-display font-bold ${large ? "text-3xl" : "text-2xl"} text-primary tabular-nums`}>
          {formatCurrency(preco)}
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">
          Lucro: <span className="font-semibold text-foreground">{formatCurrency(preco - custo)}</span>
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${margemBadge(margem)}`}>
          {margem.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function EmbalagemSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: any[];
  onChange: (slot: EmbalagemSlot | null) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select
        value={value || "_none"}
        onValueChange={(id) => {
          if (id === "_none") return onChange(null);
          const ins = options.find((o) => o.id === id);
          if (!ins) return;
          onChange({
            insumo_id: id,
            nome: ins.nome,
            custo_unit: Number(ins.preco_pago) / Number(ins.quantidade),
          });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">— sem embalagem —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.nome} — {formatCurrency(Number(o.preco_pago) / Number(o.quantidade))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PizzaTable({
  ingredientes,
  onChange,
  onRemove,
  custoIng,
}: {
  ingredientes: IngredientForm[];
  onChange: (idx: number, field: keyof IngredientForm, value: number) => void;
  onRemove: (idx: number) => void;
  custoIng: (i: IngredientForm, s: "p" | "m" | "g" | "single") => number;
}) {
  if (!ingredientes.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhum ingrediente. Adicione abaixo.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Ingrediente</th>
            <th className="text-center px-2 py-2 font-semibold">Qtd P</th>
            <th className="text-center px-2 py-2 font-semibold">Qtd M</th>
            <th className="text-center px-2 py-2 font-semibold">Qtd G</th>
            <th className="text-left px-2 py-2 font-semibold">Un</th>
            <th className="text-right px-2 py-2 font-semibold">Custo P/M/G</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ingredientes.map((ing, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 font-semibold">{ing.nome}</td>
              {(["qtd_p", "qtd_m", "qtd_g"] as const).map((k) => (
                <td key={k} className="px-1 py-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={ing[k] || ""}
                    onChange={(e) => onChange(i, k, parseFloat(e.target.value) || 0)}
                    className="w-20 h-9 text-center"
                  />
                </td>
              ))}
              <td className="px-2 py-2 text-xs text-muted-foreground">{ing.unidade}</td>
              <td className="px-2 py-2 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                {formatCurrency(custoIng(ing, "p"))} / {formatCurrency(custoIng(ing, "m"))} / {formatCurrency(custoIng(ing, "g"))}
              </td>
              <td className="px-2 py-2">
                <Button size="icon" variant="ghost" onClick={() => onRemove(i)} className="h-7 w-7">
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTable({
  ingredientes,
  onChange,
  onRemove,
  custoIng,
}: {
  ingredientes: IngredientForm[];
  onChange: (idx: number, field: keyof IngredientForm, value: number) => void;
  onRemove: (idx: number) => void;
  custoIng: (i: IngredientForm, s: "single") => number;
}) {
  if (!ingredientes.length) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhum ingrediente. Adicione abaixo.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Ingrediente</th>
            <th className="text-center px-2 py-2 font-semibold">Quantidade</th>
            <th className="text-left px-2 py-2 font-semibold">Un</th>
            <th className="text-right px-2 py-2 font-semibold">Custo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ingredientes.map((ing, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 font-semibold">{ing.nome}</td>
              <td className="px-1 py-1">
                <Input
                  type="number"
                  step="0.01"
                  value={ing.qtd_m || ""}
                  onChange={(e) => onChange(i, "qtd_m", parseFloat(e.target.value) || 0)}
                  className="w-24 h-9 text-center mx-auto"
                />
              </td>
              <td className="px-2 py-2 text-xs text-muted-foreground">{ing.unidade}</td>
              <td className="px-2 py-2 text-right font-mono text-xs tabular-nums">
                {formatCurrency(custoIng(ing, "single"))}
              </td>
              <td className="px-2 py-2">
                <Button size="icon" variant="ghost" onClick={() => onRemove(i)} className="h-7 w-7">
                  <Trash2 size={14} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IngredientPicker({
  insumosComprados,
  insumosProprios,
  custoMap,
  onAdd,
}: any) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const list = useMemo(() => {
    const all = [
      ...insumosComprados
        .filter((i: any) => !isEmbalagem(i.categoria))
        .map((i: any) => ({ ...i, _tipo: "comprado" })),
      ...insumosProprios.map((i: any) => ({ ...i, _tipo: "proprio" })),
    ];
    const filtered = all.filter(
      (i) =>
        matchesSearch(i.nome, search) ||
        (i.categoria && matchesSearch(i.categoria, search)),
    );
    // Produzidos primeiro
    filtered.sort((a, b) => (a._tipo === "proprio" ? -1 : 1));
    return search.trim().length === 0 ? filtered.slice(0, 80) : filtered;
  }, [insumosComprados, insumosProprios, search]);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="w-full mt-2">
        <Plus size={16} /> Adicionar Ingrediente
      </Button>
    );
  }
  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30 mt-2">
      <Input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar insumo..."
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
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
                  qtd_p: 0,
                  qtd_m: 0,
                  qtd_g: 0,
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
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">Nenhum insumo encontrado.</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(false);
          setSearch("");
        }}
      >
        Cancelar
      </Button>
    </div>
  );
}
