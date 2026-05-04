import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PercentInput } from "@/components/SmartInputs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { appError } from "@/lib/error-codes";
import { Cog, Save, AlertTriangle, Check, TrendingUp, TrendingDown, Activity, ChevronDown, Info } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";
import {
  fmt, fmtPct, calcCmv, converterQuantidade, cmvBg, cmvColor, cmvEmoji, cmvMessage,
  calcAppPrice, getActiveApps, APP_TOOLTIP,
  type ConfigPrecificacao, type AppInfo,
} from "@/lib/pricing-helpers";
import { PageHeader } from "@/components/layout/PageHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface FichaPizza {
  id: string;
  nome: string;
  tipo: string | null;
  preco_venda_p: number | null;
  preco_venda_m: number | null;
  preco_venda_g: number | null;
}

interface Ingrediente {
  ficha_id: string | null;
  tipo_insumo: string;
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  qtd_p: number | null;
  qtd_m: number | null;
  qtd_g: number | null;
  unidade: string;
}

interface InsumoComprado {
  id: string;
  nome: string;
  preco_pago: number;
  quantidade: number;
  unidade: string;
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

// ─── Component ───────────────────────────────────────────────────────
export default function PrecificacaoPizzas() {
  const queryClient = useQueryClient();
  const [configOpen, setConfigOpen] = useState(false);
  const [localPrices, setLocalPrices] = useState<Record<string, { p: string; m: string; g: string }>>({});
  const [configForm, setConfigForm] = useState<ConfigPrecificacao | null>(null);
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: config } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_precificacao")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigPrecificacao | null;
    },
  });

  const { data: fichas = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_pizza")
        .select("*")
        .order("tipo")
        .order("nome");
      if (error) throw error;
      return data as FichaPizza[];
    },
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["fichas_tecnicas_pizza_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_pizza_ingredientes").select("*");
      if (error) throw error;
      return data as Ingrediente[];
    },
  });

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

  const { data: configNegocio } = useQuery({
    queryKey: ["configuracoes_negocio_mix"],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes_negocio")
        .select("pct_dinheiro_pix,pct_debito,pct_credito,pct_ifood,lucro_desejado_pct")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // ─── Cost maps ───────────────────────────────────────────────────
  const custoCompradoMap = useMemo(() => {
    const m = new Map<string, number>();
    insumosComprados.forEach((ic) => m.set(ic.id, Number(ic.preco_pago) / Number(ic.quantidade)));
    return m;
  }, [insumosComprados]);

  const custoProprioMap = useMemo(() => {
    const m = new Map<string, number>();
    insumosProprios.forEach((ip) => {
      const ings = ingredientesProprios.filter((i) => i.insumo_proprio_id === ip.id);
      const custoTotal = ings.reduce((acc, ing) => {
        const custoUnit = custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0;
        return acc + custoUnit * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      m.set(ip.id, Number(ip.rendimento) > 0 ? custoTotal / Number(ip.rendimento) : 0);
    });
    return m;
  }, [insumosProprios, ingredientesProprios, custoCompradoMap]);

  // ─── Calculate costs per pizza ───────────────────────────────────
  const pizzaCustos = useMemo(() => {
    const result: Record<string, { p: number; m: number; g: number }> = {};
    fichas.forEach((f) => {
      const ings = ingredientes.filter((i) => i.ficha_id === f.id);
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
  }, [fichas, ingredientes, custoCompradoMap, custoProprioMap]);

  // ─── Get effective price ─────────────────────────────────────────
  const getPreco = useCallback(
    (fichaId: string, size: "p" | "m" | "g", ficha: FichaPizza) => {
      const local = localPrices[fichaId]?.[size];
      if (local !== undefined && local !== "") return parseFloat(local);
      const key = `preco_venda_${size}` as keyof FichaPizza;
      return Number(ficha[key] ?? 0);
    },
    [localPrices]
  );

  // ─── Indicators ──────────────────────────────────────────────────
  const indicators = useMemo(() => {
    let totalCmv = 0;
    let count = 0;
    let foraMetaCount = 0;

    fichas.forEach((f) => {
      const custos = pizzaCustos[f.id];
      if (!custos) return;
      (["p", "m", "g"] as const).forEach((s) => {
        const preco = getPreco(f.id, s, f);
        if (preco > 0) {
          const cmv = calcCmv(custos[s], preco);
          totalCmv += cmv;
          count++;
          if (cmv > 40) foraMetaCount++;
        }
      });
    });

    const avgCmv = count > 0 ? totalCmv / count : 0;
    return { avgCmv, foraMetaCount };
  }, [fichas, pizzaCustos, getPreco]);

  // ─── Save config ─────────────────────────────────────────────────
  const configMutation = useMutation({
    mutationFn: async (c: ConfigPrecificacao) => {
      if (c.id) {
        const { error } = await supabase
          .from("configuracoes_precificacao")
          .update({
            custos_fixos_pct: c.custos_fixos_pct,
            cmv_meta_pct: c.cmv_meta_pct,
            taxa_ifood_pct: c.taxa_ifood_pct,
            taxa_debito_pct: c.taxa_debito_pct,
            taxa_credito_pct: c.taxa_credito_pct,
            taxa_pix_pct: c.taxa_pix_pct,
          })
          .eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuracoes_precificacao")
          .insert({
            custos_fixos_pct: c.custos_fixos_pct,
            cmv_meta_pct: c.cmv_meta_pct,
            taxa_ifood_pct: c.taxa_ifood_pct,
            taxa_debito_pct: c.taxa_debito_pct,
            taxa_credito_pct: c.taxa_credito_pct,
            taxa_pix_pct: c.taxa_pix_pct,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes_precificacao"] });
      toast.success("Configurações salvas!");
      setConfigOpen(false);
    },
    onError: (e) => appError("ERR-PRC-001", e),
  });

  // ─── Auto-save single price on blur ──────────────────────────────
  const autoSavePrice = useCallback(
    async (fichaId: string, size: "p" | "m" | "g", value: string) => {
      const numVal = parseFloat(value) || 0;
      const colMap = { p: "preco_venda_p", m: "preco_venda_m", g: "preco_venda_g" } as const;
      const updateData = { [colMap[size]]: numVal || null };
      const { error } = await supabase
        .from("fichas_tecnicas_pizza")
        .update(updateData as any)
        .eq("id", fichaId);
      if (error) {
        appError("ERR-PRC-002");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      const key = `${fichaId}-${size}`;
      setSavedFields((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setSavedFields((prev) => ({ ...prev, [key]: false })), 2000);
    },
    [queryClient]
  );

  const handlePriceChange = (fichaId: string, size: "p" | "m" | "g", value: string) => {
    setLocalPrices((prev) => ({
      ...prev,
      [fichaId]: { ...prev[fichaId], [size]: value },
    }));
  };

  const handlePriceBlur = (fichaId: string, size: "p" | "m" | "g", ficha: FichaPizza) => {
    const local = localPrices[fichaId]?.[size];
    if (local === undefined) return;
    const original = String(ficha[`preco_venda_${size}` as keyof FichaPizza] ?? "");
    if (local === original) return;
    autoSavePrice(fichaId, size, local);
    setLocalPrices((prev) => {
      const copy = { ...prev };
      if (copy[fichaId]) {
        delete copy[fichaId][size];
        if (!copy[fichaId].p && !copy[fichaId].m && !copy[fichaId].g) delete copy[fichaId];
      }
      return copy;
    });
  };

  const cmvMeta = config?.cmv_meta_pct ?? 32;
  const activeApps = getActiveApps(config);

  // ─── Taxa ponderada de pagamento + cálculos de sobra/breakeven ──
  const taxaPonderada = useMemo(() => {
    if (!config) return 0;
    const m = configNegocio;
    const somaMix = m ? Number(m.pct_dinheiro_pix ?? 0) + Number(m.pct_debito ?? 0) + Number(m.pct_credito ?? 0) + Number(m.pct_ifood ?? 0) : 0;
    if (!m || somaMix < 1) {
      return (config.taxa_credito_pct + config.taxa_debito_pct + config.taxa_pix_pct + config.taxa_ifood_pct) / 4;
    }
    return (
      (Number(m.pct_dinheiro_pix) / 100) * config.taxa_pix_pct +
      (Number(m.pct_debito)       / 100) * config.taxa_debito_pct +
      (Number(m.pct_credito)      / 100) * config.taxa_credito_pct +
      (Number(m.pct_ifood)        / 100) * config.taxa_ifood_pct
    );
  }, [config, configNegocio]);

  const custosFixosPct = Number(config?.custos_fixos_pct ?? 22);

  /** Sobra real (lucro líquido) em R$: preço − custo − custos_fixos% − taxas% */
  const calcSobra = (preco: number, custo: number) => {
    if (preco <= 0) return 0;
    return preco - custo - preco * (custosFixosPct / 100) - preco * (taxaPonderada / 100);
  };

  /** Preço de breakeven (lucro zero): custo / (1 − (custos_fixos% + taxas%)) */
  const calcPrecoZero = (custo: number) => {
    const denom = 1 - (custosFixosPct + taxaPonderada) / 100;
    if (denom <= 0) return 0;
    return custo / denom;
  };

  const tipoLabel = (tipo: string | null) => {
    if (!tipo) return "";
    const map: Record<string, string> = {
      tradicional: "Tradicional",
      especial: "Especial",
      premium: "Premium",
      doce: "Doce",
    };
    return map[tipo] ?? tipo;
  };

  const sizes = ["p", "m", "g"] as const;
  const sizeLabels = { p: "P", m: "M", g: "G" };

  // CMV pill colors — padrão Abrasel (alinhado com pricing-helpers.ts)
  // < 25% azul (margem alta) | 25-35% verde (ideal) | 35-40% amarelo (atenção) | > 40% vermelho (prejuízo)
  const getCmvPillStyle = (cmv: number) => {
    if (cmv > 40) return { bg: 'hsl(var(--destructive))', text: 'hsl(var(--destructive-foreground))', glow: 'hsl(var(--destructive) / 0.25)' };
    if (cmv > 35) return { bg: 'hsl(var(--warning))', text: 'hsl(var(--foreground))', glow: 'hsl(var(--warning) / 0.25)' };
    if (cmv < 25) return { bg: 'hsl(var(--info, 217 91% 60%))', text: 'hsl(var(--primary-foreground))', glow: 'hsl(var(--info, 217 91% 60%) / 0.25)' };
    return { bg: 'hsl(var(--success))', text: 'hsl(var(--primary-foreground))', glow: 'hsl(var(--success) / 0.25)' };
  };

  // Health dot for card header — mesmas faixas Abrasel
  const getHealthColor = (cmvs: { p: number; m: number; g: number }, precos: { p: number; m: number; g: number }) => {
    const activeCmvs = sizes.filter(s => precos[s] > 0).map(s => cmvs[s]);
    if (activeCmvs.length === 0) return { color: 'hsl(var(--muted-foreground))', glow: 'transparent' };
    const worst = Math.max(...activeCmvs);
    if (worst > 40) return { color: 'hsl(var(--destructive))', glow: 'hsl(var(--destructive) / 0.4)' };
    if (worst > 35) return { color: 'hsl(var(--warning))', glow: 'hsl(var(--warning) / 0.4)' };
    return { color: 'hsl(var(--success))', glow: 'hsl(var(--success) / 0.4)' };
  };

  // Border do input "Seu Preço" — mesmas faixas
  const getCmvBorderColors = (cmv: number, preco: number) => {
    if (preco <= 0) return { border: 'hsl(var(--border))', glow: 'transparent' };
    if (cmv > 40) return { border: 'hsl(var(--destructive))', glow: 'hsl(var(--destructive) / 0.10)' };
    if (cmv > 35) return { border: 'hsl(var(--warning))', glow: 'hsl(var(--warning) / 0.10)' };
    return { border: 'hsl(var(--success))', glow: 'hsl(var(--success) / 0.10)' };
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 page-enter">
        <PageHeader title="Precificação de Pizzas" description="Gestão de margem por tamanho · Terminal de precisão.">
          <button
            onClick={() => {
              const defaultConfig: ConfigPrecificacao = {
                id: "",
                custos_fixos_pct: 15,
                cmv_meta_pct: 32,
                taxa_ifood_pct: 12,
                taxa_debito_pct: 1.5,
                taxa_credito_pct: 3.5,
                taxa_pix_pct: 0,
                app_ifood_ativo: false,
                app_rappi_ativo: false,
                app_aiqfome_ativo: false,
                app_outro_ativo: false,
                app_outro_nome: "",
                taxa_rappi_pct: 0,
                taxa_aiqfome_pct: 0,
                taxa_outro_pct: 0,
                ifood_plano: "entrega",
                created_at: "",
                updated_at: "",
                user_id: null,
              } as any;
              setConfigForm(config ?? defaultConfig);
              setConfigOpen(!configOpen);
            }}
            className="btn-micro flex items-center gap-2 px-5 h-10 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card transition-all"
          >
            <Cog className="h-4 w-4" />
            <span>Configurações</span>
          </button>
        </PageHeader>

        {/* Config panel */}
        {configOpen && configForm && (
          <Card className="border-primary/30 card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configurações Globais de Precificação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {([
                  ["custos_fixos_pct", "% Custos Fixos"],
                  ["cmv_meta_pct", "% CMV Meta"],
                  ["taxa_ifood_pct", "% Taxa iFood"],
                  ["taxa_debito_pct", "% Taxa Débito"],
                  ["taxa_credito_pct", "% Taxa Crédito"],
                  ["taxa_pix_pct", "% Taxa PIX"],
                ] as [keyof ConfigPrecificacao, string][]).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-xs font-bold uppercase tracking-wider">{label}</Label>
                    <PercentInput
                      value={configForm[key] as number}
                      onChange={(v) =>
                        setConfigForm({ ...configForm, [key]: v })
                      }
                      disabled={key === "taxa_pix_pct"}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={() => configMutation.mutate(configForm)} className="btn-micro">
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ KPI Cards ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger-fade-in">
          <div className="card-premium group">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Custo Médio das Pizzas</p>
            </div>
            <p className={cn("text-[48px] font-extrabold leading-none tracking-tight font-terminal", cmvColor(indicators.avgCmv))}>
              {fmtPct(indicators.avgCmv)}
            </p>
            <p className="text-[12px] text-muted-foreground font-medium mt-3">
              {cmvMessage(indicators.avgCmv)}
            </p>
          </div>

          <div className="card-premium group">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive">Precisam de Atenção</p>
            </div>
            <p className="text-[48px] font-extrabold leading-none text-destructive font-terminal">{indicators.foraMetaCount}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-3">Tamanhos com custo &gt; 40%</p>
          </div>
        </div>

        {/* ═══ Legenda das faixas de CMV (padrão Abrasel) ═══ */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="text-muted-foreground uppercase tracking-wider mr-1">Faixas de CMV:</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">&lt; 25% Margem alta</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">25–35% Ideal</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">35–40% Atenção</span>
          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">&gt; 40% Prejuízo</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              CMV = Custo da Mercadoria Vendida. Mostra quanto do preço de venda é consumido pelo custo do produto. Faixas baseadas no padrão Abrasel para food service.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ═══ Pizza Cards — Summary + Expand ═══ */}
        <div className="space-y-4">
          {fichas.length === 0 ? (
            <div className="card-premium flex flex-col items-center gap-5 py-20">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Activity className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm font-semibold">Nenhuma pizza cadastrada ainda.</p>
              <Button
                onClick={() => window.location.href = '/fichas/pizzas?tipo=tradicional'}
                className="btn-micro gap-2"
              >
                <span className="text-lg leading-none">+</span> Cadastrar Primeira Pizza
              </Button>
            </div>
          ) : (
            fichas.map((ficha, rowIndex) => {
              const custos = pizzaCustos[ficha.id] ?? { p: 0, m: 0, g: 0 };
              const precos = { p: getPreco(ficha.id, "p", ficha), m: getPreco(ficha.id, "m", ficha), g: getPreco(ficha.id, "g", ficha) };
              const cmvs = { p: calcCmv(custos.p, precos.p), m: calcCmv(custos.m, precos.m), g: calcCmv(custos.g, precos.g) };
              const sugeridos = { p: cmvMeta > 0 ? custos.p / (cmvMeta / 100) : 0, m: cmvMeta > 0 ? custos.m / (cmvMeta / 100) : 0, g: cmvMeta > 0 ? custos.g / (cmvMeta / 100) : 0 };
              const hasAlert = cmvs.p > 40 || cmvs.m > 40 || cmvs.g > 40;
              const isOpen = expandedCards[ficha.id] ?? false;
              const health = getHealthColor(cmvs, precos);

              return (
                <Collapsible
                  key={ficha.id}
                  open={isOpen}
                  onOpenChange={() => toggleCard(ficha.id)}
                >
                  <div
                    className={cn(
                      "row-reveal rounded-xl overflow-hidden transition-all duration-300",
                      hasAlert ? "shadow-[0_0_0_1px_hsl(var(--destructive)/0.08)]" : "",
                      isOpen ? "shadow-lg" : "shadow-sm hover:shadow-md"
                    )}
                    style={{
                      animationDelay: `${rowIndex * 60}ms`,
                          background: 'rgba(211, 211, 211, 0.13)',
                      backdropFilter: 'blur(10px)',
                      border: hasAlert ? '1px solid hsl(var(--destructive) / 0.3)' : '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '15px',
                    }}
                  >
                    {/* ── Collapsed Summary (always visible) ── */}
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors cursor-pointer text-left group">
                        <div className="flex items-center gap-4">
                          {/* Health dot */}
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0 transition-all"
                            style={{ background: health.color, boxShadow: `0 0 8px ${health.glow}` }}
                          />
                          <div>
                            <h3 className="font-extrabold text-lg text-foreground leading-tight">{ficha.nome}</h3>
                            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.12em]">{tipoLabel(ficha.tipo)}</span>
                          </div>
                        </div>

                        {/* Quick price + CMV summary */}
                        <div className="flex items-center gap-5">
                          {sizes.map((s) => {
                            const preco = precos[s];
                            const cmv = cmvs[s];
                            const pill = getCmvPillStyle(cmv);
                            return (
                              <div key={s} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-4">{sizeLabels[s]}</span>
                                {preco > 0 ? (
                                  <>
                                    <span className="font-terminal text-sm font-bold text-foreground tabular-nums">
                                      {formatMoney(preco)}
                                    </span>
                                    <span
                                      className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full font-terminal"
                                      style={{ background: pill.bg, color: pill.text, boxShadow: `0 2px 8px ${pill.glow}` }}
                                    >
                                      {fmtPct(cmv)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs font-terminal">—</span>
                                )}
                              </div>
                            );
                          })}

                          <ChevronDown
                            className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform duration-300 ml-2",
                              isOpen && "rotate-180"
                            )}
                          />
                        </div>
                      </button>
                    </CollapsibleTrigger>

                    {/* ── Expanded Detail ── */}
                    <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="border-t border-border/40" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                        {sizes.map((s, sizeIdx) => {
                          const custo = custos[s];
                          const sug = sugeridos[s];
                          const preco = precos[s];
                          const cmv = cmvs[s];
                          const fieldKey = `${ficha.id}-${s}`;
                          const { border: borderColor, glow: glowColor } = getCmvBorderColors(cmv, preco);
                          const belowSuggested = preco > 0 && sug > 0 && preco < sug;
                          const pill = getCmvPillStyle(cmv);

                          return (
                            <div
                              key={s}
                              className="p-6 space-y-5 fade-up rounded-xl"
                              style={{ animationDelay: `${sizeIdx * 50}ms`, background: 'rgba(211, 211, 211, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.3)' }}
                            >
                              {/* Size badge */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg" style={{ color: '#5D5D5D' }}>
                                  Tamanho {sizeLabels[s]}
                                </span>
                                {preco > 0 && (
                                  <span
                                    className="text-xs font-bold px-3 py-1 rounded-full font-terminal"
                                    style={{ background: pill.bg, color: pill.text, boxShadow: `0 2px 8px ${pill.glow}` }}
                                  >
                                    CMV {fmtPct(cmv)}
                                  </span>
                                )}
                              </div>

                              {/* Info block — Custo + Sugerido */}
                              <div className="rounded-lg p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#5D5D5D' }}>Custo</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xs font-bold" style={{ color: '#5D5D5D' }}>R$</span>
                                    <span className="text-base font-bold font-terminal" style={{ color: '#5D5D5D' }}>{custo.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="h-px bg-border/40" />
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] flex items-center gap-1" style={{ color: '#5D5D5D' }}>
                                    Sugerido
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button type="button" className="opacity-60 hover:opacity-100 transition-opacity">
                                          <Info className="h-3 w-3" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs text-xs">
                                        Preço mínimo para cobrir o custo do produto + custos fixos + taxas de pagamento + seu lucro desejado. Cobrar acima é melhor; cobrar abaixo aperta sua margem.
                                      </TooltipContent>
                                    </Tooltip>
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xs font-bold" style={{ color: '#5D5D5D' }}>R$</span>
                                    <span className="text-base font-bold font-terminal" style={{ color: '#5D5D5D' }}>{sug.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Action block — Seu Preço */}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary block">Seu Preço</span>
                                <div className="relative">
                                  <input
                                    type={localPrices[ficha.id]?.[s] !== undefined ? "number" : "text"}
                                    step={localPrices[ficha.id]?.[s] !== undefined ? "0.01" : undefined}
                                    className="input-glow-focus w-full text-center rounded-lg outline-none font-terminal"
                                    style={{
                                      height: '52px',
                                      fontSize: '20px',
                                      fontWeight: 800,
                                      fontFeatureSettings: "'tnum'",
                                      color: 'hsl(var(--foreground))',
                                      background: 'rgba(255, 255, 255, 0.6)',
                                      border: `2px solid ${borderColor}`,
                                      boxShadow: `0 0 12px ${glowColor}`,
                                    }}
                                    onFocus={(e) => {
                                      e.currentTarget.style.boxShadow = `0 0 0 3px ${borderColor}25, 0 0 20px ${borderColor}15`;
                                      e.currentTarget.style.transform = 'scale(1.03)';
                                      e.currentTarget.select();
                                      if (localPrices[ficha.id]?.[s] === undefined) {
                                        handlePriceChange(ficha.id, s, String(ficha[`preco_venda_${s}` as keyof FichaPizza] ?? ""));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      e.currentTarget.style.boxShadow = `0 0 12px ${glowColor}`;
                                      e.currentTarget.style.transform = 'scale(1)';
                                      handlePriceBlur(ficha.id, s, ficha);
                                    }}
                                    value={
                                      localPrices[ficha.id]?.[s] !== undefined
                                        ? localPrices[ficha.id][s]
                                        : (ficha[`preco_venda_${s}` as keyof FichaPizza]
                                          ? formatMoney(Number(ficha[`preco_venda_${s}` as keyof FichaPizza]))
                                          : "")
                                    }
                                    onChange={(e) => handlePriceChange(ficha.id, s, e.target.value)}
                                    placeholder="R$ 0,00"
                                  />
                                  {savedFields[fieldKey] && (
                                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary animate-in fade-in duration-200" />
                                  )}
                                  {belowSuggested && !savedFields[fieldKey] && (
                                    <span className="absolute -right-1 -top-2 text-warning" title="Preço abaixo do sugerido"><AlertTriangle className="h-3.5 w-3.5" /></span>
                                  )}
                                </div>
                              </div>

                              {/* App Prices */}
                              {activeApps.length > 0 && (
                                <div className="pt-3 border-t border-border/30 space-y-2.5">
                                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Delivery Apps</span>
                                  {activeApps.map((app) => {
                                    const appPrice = preco > 0 ? calcAppPrice(preco, app.taxa) : 0;
                                    const appCmv = calcCmv(custo, appPrice);
                                    const appPill = getCmvPillStyle(appCmv);
                                    return (
                                      <div key={app.key} className="flex items-center justify-between">
                                        <div>
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{app.label}</span>
                                          {appPrice > 0 && (
                                            <p className="text-sm font-bold font-terminal text-foreground">
                                              <span className="text-[10px] text-muted-foreground mr-0.5">R$</span>
                                              {appPrice.toFixed(2)}
                                            </p>
                                          )}
                                        </div>
                                        {appPrice > 0 ? (
                                          <span
                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full font-terminal"
                                            style={{ background: appPill.bg, color: appPill.text }}
                                          >
                                            {fmtPct(appCmv)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground/40 text-xs">—</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}