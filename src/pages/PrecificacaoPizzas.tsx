import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SkeletonCard, SkeletonPricingRow } from "@/components/SkeletonCard";
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
import { Cog, Save, AlertTriangle, Check, TrendingUp, TrendingDown, Activity, ChevronDown, Info, Zap } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";
import { Money } from "@/components/Money";
import {
  fmt, fmtPct, calcCmv, converterQuantidade, cmvBg, cmvColor, cmvEmoji, cmvMessage,
  calcAppPrice, getActiveApps, APP_TOOLTIP,
  type ConfigPrecificacao, type AppInfo,
} from "@/lib/pricing-helpers";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageHero } from "@/components/layout/PageHero";
import { StatCard, StatCardGrid } from "@/components/layout/StatCardGrid";
import { PrecificacaoCategoryTabs } from "@/components/precificacao/PrecificacaoCategoryTabs";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";

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
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [localPrices, setLocalPrices] = useState<Record<string, { p: string; m: string; g: string }>>({});
  const [configForm, setConfigForm] = useState<ConfigPrecificacao | null>(null);
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [mobileSize, setMobileSize] = useState<Record<string, "p" | "m" | "g">>({});

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

  const { data: fichas = [], isLoading: loadingFichas } = useQuery({
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

  // ─── Caixa do mês + Alertas de Insumos ──────────────────────────
  const { lucroMes = 0 } = useDashboardData() as any;
  const { data: priceAlerts = [] } = usePriceAlerts();
  const [showOnlyAffected, setShowOnlyAffected] = useState(false);

  // Mapa nome(lower) → alerta (variação)
  const alertByNome = useMemo(() => {
    const m = new Map<string, { nome: string; variacaoPct: number }>();
    (priceAlerts as any[]).forEach((a) => {
      m.set(String(a.nome).trim().toLowerCase(), { nome: a.nome, variacaoPct: a.variacaoPct });
    });
    return m;
  }, [priceAlerts]);

  // insumo_id → alerta (resolvendo via nome)
  const alertByInsumoId = useMemo(() => {
    const m = new Map<string, { nome: string; variacaoPct: number }>();
    insumosComprados.forEach((ic) => {
      const a = alertByNome.get(String(ic.nome).trim().toLowerCase());
      if (a) m.set(ic.id, a);
    });
    return m;
  }, [insumosComprados, alertByNome]);

  // Para cada ficha → pior alerta entre os insumos usados
  const fichaTopAlert = useMemo(() => {
    const map = new Map<string, { nome: string; variacaoPct: number }>();
    fichas.forEach((f) => {
      const ings = ingredientes.filter((i) => i.ficha_id === f.id);
      let worst: { nome: string; variacaoPct: number } | null = null;
      ings.forEach((ing) => {
        const a = ing.insumo_comprado_id ? alertByInsumoId.get(ing.insumo_comprado_id) : null;
        if (a && (!worst || a.variacaoPct > worst.variacaoPct)) worst = a;
      });
      if (worst) map.set(f.id, worst);
    });
    return map;
  }, [fichas, ingredientes, alertByInsumoId]);

  const affectedCount = fichaTopAlert.size;

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
    // Premium pastel palette — high-contrast dark text on soft backgrounds
    if (cmv > 40) return { bg: '#fef2f2', text: '#991b1b', border: 'rgba(153, 27, 27, 0.1)', glow: 'hsl(var(--destructive) / 0.25)' };
    if (cmv > 35) return { bg: '#fefce8', text: '#854d0e', border: 'rgba(133, 77, 14, 0.1)', glow: 'hsl(var(--warning) / 0.25)' };
    if (cmv < 25) return { bg: '#eff6ff', text: '#1e40af', border: 'rgba(37, 99, 235, 0.1)', glow: 'hsl(var(--info, 217 91% 60%) / 0.25)' };
    return { bg: '#f0fdf4', text: '#166534', border: 'rgba(22, 101, 52, 0.1)', glow: 'hsl(var(--success) / 0.25)' };
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
        <PrecificacaoCategoryTabs />
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

        {/* ═══ Header em grid de 3 cards independentes ═══ */}
        <section
          className="grid gap-4"
          style={{ gridTemplateColumns: lucroMes < 0 ? "1.2fr 1fr 1fr" : "1fr 1fr" }}
        >
          {/* Card 1 — Alerta de caixa (destaque) */}
          {lucroMes < 0 && (
            <div
              className="rounded-2xl shadow-sm flex flex-col p-5"
              style={{
                background: "linear-gradient(135deg, rgba(254, 226, 226, 0.4) 0%, rgba(254, 226, 226, 0.1) 100%)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
                borderLeft: "4px solid #dc2626",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                  <AlertTriangle className="h-4.5 w-4.5 text-red-700" strokeWidth={2.5} />
                </div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-red-700">
                  Caixa negativo
                </span>
              </div>
              <div className="mt-3 text-finance-mono text-[34px] font-extrabold leading-none tabular-nums text-red-700">
                {formatMoney(lucroMes)}
              </div>
              <p className="mt-2 text-[12.5px] text-slate-700 leading-snug flex-1">
                {affectedCount > 0
                  ? `${affectedCount} ${affectedCount === 1 ? "pizza usa" : "pizzas usam"} insumos com alta no mercado, sufocando o lucro.`
                  : "Revise sua precificação — o CMV médio está consumindo a margem do mês."}
              </p>
              {affectedCount > 0 && (
                <button
                  onClick={() => setShowOnlyAffected((v) => !v)}
                  className="mt-3 w-full bg-red-700 hover:bg-red-800 text-white transition-colors px-3.5 py-2 rounded-lg font-semibold text-[12.5px] shadow-sm"
                >
                  {showOnlyAffected ? "Mostrar Todas" : "Corrigir Afetadas"}
                </button>
              )}
            </div>
          )}

          {/* Card 2 — Comprometem a meta */}
          <button
            type="button"
            onClick={() => setShowOnlyAffected((v) => !v)}
            disabled={affectedCount === 0}
            className="text-left rounded-2xl border border-slate-200 bg-white shadow-sm p-5 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/40 disabled:cursor-default disabled:hover:bg-white"
          >
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              <TrendingDown className={cn("h-3.5 w-3.5", affectedCount > 0 ? "text-red-600" : "text-slate-400")} />
              {showOnlyAffected ? "Filtrando afetadas" : "Comprometem a meta"}
            </div>
            <div
              className="mt-3 text-[32px] font-extrabold leading-none tabular-nums"
              style={{ color: affectedCount > 0 ? "#b91c1c" : "#0f172a" }}
            >
              {affectedCount > 0 ? affectedCount : indicators.foraMetaCount}
            </div>
            <p className="mt-2 text-[12px] text-slate-500 leading-snug">
              Pizzas acima do CMV ideal de {cmvMeta.toFixed(0)}%.
            </p>
          </button>

          {/* Card 3 — Total + Meta de CMV */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <Activity className="h-3.5 w-3.5 text-slate-400" />
                  Total de pizzas
                </div>
                <div className="mt-3 text-[32px] font-extrabold leading-none tabular-nums text-[#0f172a]">
                  {fichas.length}
                </div>
              </div>
              <div className="flex flex-col border-l border-slate-200 pl-4">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <Cog className="h-3.5 w-3.5 text-slate-400" />
                  Meta de CMV
                </div>
                <div className="mt-3 text-[32px] font-extrabold leading-none tabular-nums text-[#0f172a]">
                  {cmvMeta.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ═══ Régua global FAIXAS DE CMV ═══ */}
        <div className="flex flex-wrap items-center text-[11px]" style={{ gap: "8px" }}>
          <span className="text-slate-500 uppercase tracking-wider mr-1 font-semibold">Faixas de CMV:</span>
          <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid rgba(37, 99, 235, 0.1)', borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}>&lt; 25% Margem alta</span>
          <span style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid rgba(22, 101, 52, 0.1)', borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}>25–35% Ideal</span>
          <span style={{ backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid rgba(133, 77, 14, 0.1)', borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}>35–40% Atenção</span>
          <span style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid rgba(153, 27, 27, 0.1)', borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}>&gt; 40% Prejuízo</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-slate-400 hover:text-slate-700 transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              CMV = Custo da Mercadoria Vendida. Faixas baseadas no padrão Abrasel para food service.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ═══ Pizza Cards — Summary + Expand ═══ */}
        <div className="space-y-4">
          {loadingFichas ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonPricingRow key={i} />)}
            </div>
          ) : fichas.length === 0 ? (
            <div className="card-premium flex flex-col items-center gap-5 py-20">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Activity className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm font-semibold">Nenhuma pizza cadastrada ainda.</p>
              <Button
                onClick={() => navigate('/fichas/pizzas?tipo=tradicional')}
                className="btn-micro gap-2"
              >
                <span className="text-lg leading-none">+</span> Cadastrar Primeira Pizza
              </Button>
            </div>
          ) : (
            fichas
              .filter((f) => !showOnlyAffected || fichaTopAlert.has(f.id))
              .map((ficha, rowIndex) => {
              const custos = pizzaCustos[ficha.id] ?? { p: 0, m: 0, g: 0 };
              const precos = { p: getPreco(ficha.id, "p", ficha), m: getPreco(ficha.id, "m", ficha), g: getPreco(ficha.id, "g", ficha) };
              const cmvs = { p: calcCmv(custos.p, precos.p), m: calcCmv(custos.m, precos.m), g: calcCmv(custos.g, precos.g) };
              const sugeridos = { p: cmvMeta > 0 ? custos.p / (cmvMeta / 100) : 0, m: cmvMeta > 0 ? custos.m / (cmvMeta / 100) : 0, g: cmvMeta > 0 ? custos.g / (cmvMeta / 100) : 0 };
              const hasAlert = cmvs.p > 40 || cmvs.m > 40 || cmvs.g > 40;
              const isOpen = expandedCards[ficha.id] ?? false;
              const health = getHealthColor(cmvs, precos);
              const insumoAlert = fichaTopAlert.get(ficha.id);

              return (
                <Collapsible
                  key={ficha.id}
                  open={isOpen}
                  onOpenChange={() => toggleCard(ficha.id)}
                >
                  <div
                    className={cn(
                      "row-reveal rounded-2xl overflow-hidden transition-all duration-300 bg-card",
                      hasAlert
                        ? "border border-destructive/30 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(220,38,38,0.18)]"
                        : "border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_28px_-12px_rgba(15,23,42,0.12)]"
                    )}
                    style={{ animationDelay: `${rowIndex * 60}ms` }}
                  >
                    {/* ── Insight Strip (blue card, lucide icon) — só aparece quando há alerta de insumo ── */}
                    {insumoAlert && (
                      <div className="flex items-center gap-2.5 px-6 py-2.5 bg-[#EFF6FF] border-b border-[#BFDBFE]">
                        <AlertTriangle className="h-4 w-4 text-[#2563EB] flex-shrink-0" />
                        <p className="text-[12.5px] text-slate-700 leading-tight">
                          <span className="font-semibold text-slate-900">{insumoAlert.nome}</span>
                          <span className="text-slate-600"> subiu </span>
                          <span className="font-semibold text-[#2563EB] text-finance-mono">+{insumoAlert.variacaoPct.toFixed(1)}%</span>
                          <span className="text-slate-600"> na última compra — revise o preço sugerido.</span>
                        </p>
                      </div>
                    )}

                    {/* ── Collapsed Summary (always visible) ── */}
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-50/60 transition-colors cursor-pointer text-left group">
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Health dot */}
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-all"
                            style={{ background: health.color, boxShadow: `0 0 8px ${health.glow}` }}
                          />
                          <div className="min-w-0">
                            <h3 className="text-table-row-title text-[17px] leading-tight truncate">{ficha.nome}</h3>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                              {tipoLabel(ficha.tipo)}
                            </span>
                          </div>
                        </div>

                        {/* Quick price + CMV summary — hierarquia: preço herói, CMV em pílula sutil */}
                        <div className="flex items-center gap-4">
                          <div className="grid grid-cols-3 gap-4">
                          {sizes.map((s) => {
                            const preco = precos[s];
                            const cmv = cmvs[s];
                            const pill = getCmvPillStyle(cmv);
                            return (
                              <div key={s} className="flex flex-col items-center justify-center text-center gap-1 min-w-[88px]">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  {sizeLabels[s]}
                                </span>
                                {preco > 0 ? (
                                  <>
                                    <Money value={preco} className="text-[16px] font-extrabold text-slate-900 leading-none tabular-nums my-1" symbolScale={0.55} />
                                    <span
                                      className="inline-flex items-center justify-center text-finance-mono text-[10.5px] tabular-nums"
                                      style={{ background: pill.bg, color: pill.text, border: `1px solid ${pill.border}`, borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}
                                    >
                                      {fmtPct(cmv)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground/40 text-finance-mono text-xs">—</span>
                                )}
                              </div>
                            );
                          })}
                          </div>

                          <ChevronDown
                            className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform duration-300 ml-2",
                              isOpen && "rotate-180"
                            )}
                          />
                        </div>
                      </button>
                    </CollapsibleTrigger>


                    {/* ── Expanded Detail — Grid de alta performance (labels fixas + 3 colunas) ── */}
                    <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="border-t border-border/40" />
                      <div className="p-4 md:p-6">
                        {/* Mobile segmented control (P/M/G) — visível só < md */}
                        <div className="md:hidden mb-4 flex gap-1 p-1 rounded-xl bg-slate-200">
                          {sizes.map((s) => {
                            const active = (mobileSize[ficha.id] ?? "p") === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setMobileSize((prev) => ({ ...prev, [ficha.id]: s }))}
                                className={cn(
                                  "flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all",
                                  active ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-600",
                                )}
                              >
                                Tamanho {sizeLabels[s]}
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                            {/* ─── 3 Glass Cards: P / M / G ─── */}
                            {sizes.map((s, sizeIdx) => {
                              const custo = custos[s];
                              const sug = sugeridos[s];
                              const preco = precos[s];
                              const cmv = cmvs[s];
                              const fieldKey = `${ficha.id}-${s}`;
                              const { border: borderColor, glow: glowColor } = getCmvBorderColors(cmv, preco);
                              const belowSuggested = preco > 0 && sug > 0 && preco < sug;
                              const sobra = calcSobra(preco, custo);
                              const sobraPct = preco > 0 ? (sobra / preco) * 100 : 0;
                              const sobraPositiva = sobra > 0;
                              const precoZero = calcPrecoZero(custo);
                              const pill = getCmvPillStyle(cmv);
                              const inputValue =
                                localPrices[ficha.id]?.[s] !== undefined
                                  ? localPrices[ficha.id][s]
                                  : (ficha[`preco_venda_${s}` as keyof FichaPizza]
                                      ? formatMoney(Number(ficha[`preco_venda_${s}` as keyof FichaPizza]))
                                      : "");

                              return (
                                <div
                                  key={s}
                                  className={cn(
                                    "group relative aspect-square min-h-[360px] rounded-3xl border border-white/40 bg-white/40 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_60px_-12px_rgba(15,23,42,0.28)] hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 p-5 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 fill-mode-both",
                                    (mobileSize[ficha.id] ?? "p") !== s && "hidden md:flex",
                                  )}
                                  style={{ animationDelay: `${sizeIdx * 90}ms` }}
                                >
                                  {/* Iridescent sheen */}
                                  <div
                                    aria-hidden
                                    className="pointer-events-none absolute inset-0 rounded-3xl opacity-60"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.25) 100%)",
                                    }}
                                  />
                                  <div
                                    aria-hidden
                                    className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity"
                                    style={{ background: preco > 0 ? glowColor : "hsl(var(--primary) / 0.3)" }}
                                  />

                                  <div className="relative flex flex-col h-full">
                                    {/* Header: Tamanho centralizado + CMV pill absoluta */}
                                    <div className="relative flex items-center justify-center mb-4 h-6">
                                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                                        Tamanho {sizeLabels[s]}
                                      </span>
                                      {preco > 0 ? (
                                        <span
                                          className="absolute right-0 top-1/2 -translate-y-1/2 text-finance-mono text-[10.5px] tabular-nums"
                                          style={{ background: pill.bg, color: pill.text, border: `1px solid ${pill.border}`, borderRadius: '6px', padding: '4px 10px', fontWeight: 700 }}
                                        >
                                          {fmtPct(cmv)}
                                        </span>
                                      ) : (
                                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-finance-mono text-xs">—</span>
                                      )}
                                    </div>

                                    {/* Rows: label + value — grid rítmica com tipografia uniforme */}
                                    <div className="flex-1 flex flex-col gap-2.5 text-[13px] leading-none">
                                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <span className="text-[#475569] font-semibold">CMV Atual</span>
                                        <span className="text-finance-mono font-bold text-slate-900 tabular-nums text-right justify-self-end">{preco > 0 ? fmtPct(cmv) : "—"}</span>
                                      </div>
                                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <span className="text-[#475569] font-semibold">Custo do Insumo</span>
                                        <Money value={custo} className="text-slate-900 font-bold tabular-nums text-right justify-self-end" symbolScale={0.6} />
                                      </div>
                                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <span className="text-[#475569] font-bold">Sugerido por Meta</span>
                                        <span style={{ color: "#15803d" }} className="justify-self-end"><Money value={sug} className="font-bold tabular-nums text-right" symbolScale={0.6} /></span>
                                      </div>
                                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <span className="text-[#475569] font-bold">{sobraPositiva ? "Sobra Real (Lucro)" : "Prejuízo"}</span>
                                        <div
                                          className="flex items-baseline gap-1 text-finance-mono font-bold tabular-nums justify-self-end text-right"
                                          style={{ color: sobraPositiva ? "#15803d" : "hsl(var(--destructive))" }}
                                        >
                                          <Money value={sobra} symbolScale={0.6} />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <span className="text-[#475569] font-semibold">Preço Limite</span>
                                        <Money value={precoZero} className="text-slate-900 font-bold tabular-nums text-right justify-self-end" symbolScale={0.6} />
                                      </div>
                                    </div>

                                    {/* Preço de Venda input */}
                                    <div className="mt-6 pt-3 border-t border-white/50">
                                      <div className="flex items-center justify-center mb-2">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">Preço de Venda</span>
                                      </div>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          className="input-glow-focus text-finance-mono w-full rounded-xl outline-none text-center"
                                          style={{
                                            height: "48px",
                                            fontSize: "18px",
                                            fontWeight: 800,
                                            fontFeatureSettings: "'tnum'",
                                            color: "hsl(var(--foreground))",
                                            background: "rgba(255,255,255,0.85)",
                                            border: `2px solid ${preco > 0 ? borderColor : "hsl(var(--primary))"}`,
                                            boxShadow: preco > 0 ? `0 0 12px ${glowColor}` : "0 1px 2px rgba(0,0,0,0.04)",
                                          }}
                                          onFocus={(e) => {
                                            e.currentTarget.select();
                                            if (localPrices[ficha.id]?.[s] === undefined) {
                                              handlePriceChange(
                                                ficha.id,
                                                s,
                                                String(ficha[`preco_venda_${s}` as keyof FichaPizza] ?? "")
                                              );
                                            }
                                          }}
                                          onBlur={() => handlePriceBlur(ficha.id, s, ficha)}
                                          value={inputValue}
                                          onChange={(e) => handlePriceChange(ficha.id, s, e.target.value)}
                                          placeholder="R$ 0,00"
                                        />
                                        {savedFields[fieldKey] && (
                                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-in fade-in duration-200" />
                                        )}
                                        {belowSuggested && !savedFields[fieldKey] && (
                                          <span
                                            className="absolute -right-1 -top-2 text-warning"
                                            title="Preço abaixo do sugerido"
                                          >
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Delivery Apps */}
                                    {activeApps.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-white/50">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                          Delivery Apps
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                          {activeApps.map((app) => {
                                            const appPrice = preco > 0 ? calcAppPrice(preco, app.taxa) : 0;
                                            const appCmv = calcCmv(custo, appPrice);
                                            const appPill = getCmvPillStyle(appCmv);
                                            return (
                                              <div key={app.key} className="flex items-center justify-between text-[12px]">
                                                <span className="text-muted-foreground font-medium">{app.label}</span>
                                                {appPrice > 0 ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <Money value={appPrice} className="text-foreground font-semibold" symbolScale={0.6} />
                                                    <span
                                                      className="text-finance-mono text-[10px] px-1.5 py-0.5 rounded-full"
                                                      style={{ background: appPill.bg, color: appPill.text }}
                                                    >
                                                      {fmtPct(appCmv)}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="text-muted-foreground/40 text-finance-mono text-[11px]">—</span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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