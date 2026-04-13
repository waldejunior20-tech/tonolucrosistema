import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Settings2, Save, AlertTriangle, Check, TrendingUp, TrendingDown, Activity } from "lucide-react";
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

  // ─── Queries ─────────────────────────────────────────────────────
  const { data: config } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_precificacao")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as ConfigPrecificacao;
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes_precificacao"] });
      toast.success("Configurações salvas!");
      setConfigOpen(false);
    },
    onError: () => toast.error("Erro ao salvar configurações."),
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
        toast.error("Erro ao salvar preço.");
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
  const appCount = activeApps.length;

  // CMV pill colors
  const getCmvPillStyle = (cmv: number) => {
    if (cmv > 35) return { bg: '#EF4444', glow: 'rgba(239,68,68,0.25)' };
    if (cmv > 30) return { bg: '#F59E0B', glow: 'rgba(245,158,11,0.25)' };
    return { bg: '#10B981', glow: 'rgba(16,185,129,0.25)' };
  };

  return (
    <TooltipProvider>
      <div className="space-y-8 page-enter bg-grain">
        {/* ═══ Header — Industrial Display Font ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[32px] font-extrabold tracking-tight text-foreground leading-none">
              Precificação de Pizzas
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5 font-medium">Gestão de margem por tamanho · Terminal de precisão</p>
          </div>
          <button
            onClick={() => {
              setConfigForm(config ?? null);
              setConfigOpen(!configOpen);
            }}
            className="btn-micro flex items-center gap-2 px-5 h-10 rounded-xs border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 bg-card transition-all"
          >
            <Settings2 className="h-4 w-4" />
            <span>Configurações</span>
          </button>
        </div>

        {/* Config panel */}
        {configOpen && configForm && (
          <Card className="border-primary/30 card-industrial">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Configurações Globais de Precificação</CardTitle>
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
                    <Input
                      type="number"
                      step="0.01"
                      value={configForm[key] as number}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, [key]: parseFloat(e.target.value) || 0 })
                      }
                      disabled={key === "taxa_pix_pct"}
                      className="h-9 font-terminal"
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

        {/* ═══ KPI Cards — Industrial Bento Box ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-fade-in">
          {/* CMV Médio */}
          <div className="kpi-industrial group">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground font-display">CMV Médio Atual</p>
            </div>
            <p
              className={cn("text-[48px] font-extrabold leading-none tracking-tight font-terminal", cmvColor(indicators.avgCmv))}
            >
              {fmtPct(indicators.avgCmv)}
            </p>
            <p className="text-[12px] text-muted-foreground font-medium mt-3">Média entre todos os tamanhos</p>
          </div>

          {/* Semáforo */}
          <div className="kpi-industrial group">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground font-display">Semáforo de Saúde</p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div
                className="h-6 w-6 rounded-full"
                style={{
                  background: indicators.avgCmv > 40 ? '#EF4444' : indicators.avgCmv > 35 ? '#F59E0B' : '#10B981',
                  boxShadow: `0 0 16px ${indicators.avgCmv > 40 ? 'rgba(239,68,68,0.4)' : indicators.avgCmv > 35 ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}`,
                }}
              />
              <span className={cn("text-xl font-extrabold uppercase font-display tracking-wide", cmvColor(indicators.avgCmv))}>
                {cmvMessage(indicators.avgCmv)}
              </span>
            </div>
          </div>

          {/* Fora da Meta */}
          <div className="kpi-industrial group">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-destructive font-display">Fora da Meta</p>
            </div>
            <p className="text-[48px] font-extrabold leading-none text-destructive font-terminal">{indicators.foraMetaCount}</p>
            <p className="text-[12px] text-muted-foreground font-medium mt-3">Tamanhos com CMV &gt; 40%</p>
          </div>
        </div>

        {/* ═══ Data Grid — Industrial Performance Table ═══ */}
        <div className="card-industrial">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                {/* Main header row */}
                <TableRow
                  className="border-b-2 border-foreground/10"
                  style={{ background: '#0F172A' }}
                >
                  <TableHead
                    rowSpan={2}
                    className="align-bottom w-[180px] py-4 px-5"
                    style={{ color: '#94A3B8', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}
                  >
                    Pizza
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="align-bottom w-[80px] py-4"
                    style={{ color: '#94A3B8', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}
                  >
                    Tipo
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-l border-slate-700 py-3" style={{ color: '#64748B', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}>
                    Custo (R$)
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-l border-slate-700 py-3" style={{ color: '#64748B', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}>
                    Sugerido (R$)
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-l border-slate-700 py-3" style={{ color: '#10B981', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}>
                    Preencha seu preço
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-l border-slate-700 py-3" style={{ color: '#94A3B8', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}>
                    CMV %
                  </TableHead>
                  {activeApps.map((app) => (
                    <TableHead key={`app-${app.key}`} colSpan={3} className="text-center border-l border-slate-700 py-3" style={{ color: '#94A3B8', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}>
                      <Tooltip>
                        <TooltipTrigger asChild><span className="cursor-help">{app.label}</span></TooltipTrigger>
                        <TooltipContent><p className="max-w-[200px] text-xs">{APP_TOOLTIP}</p></TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))}
                  {activeApps.map((app) => (
                    <TableHead key={`cmv-${app.key}`} colSpan={3} className="text-center border-l border-slate-700 py-3" style={{ color: '#94A3B8', background: '#0F172A', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif' }}>
                      CMV {app.label}
                    </TableHead>
                  ))}
                </TableRow>
                {/* Sub-header: P / M / G */}
                <TableRow style={{ background: '#1E293B' }}>
                  {sizes.map((s, i) => (
                    <TableHead key={`c-${s}`} className={cn("text-center py-2", i === 0 && "border-l border-slate-700")} style={{ color: '#64748B', background: '#1E293B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{sizeLabels[s]}</TableHead>
                  ))}
                  {sizes.map((s, i) => (
                    <TableHead key={`sug-${s}`} className={cn("text-center py-2", i === 0 && "border-l border-slate-700")} style={{ color: '#64748B', background: '#1E293B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{sizeLabels[s]}</TableHead>
                  ))}
                  {sizes.map((s, i) => (
                    <TableHead key={`pr-${s}`} className={cn("text-center py-2", i === 0 && "border-l border-slate-700")} style={{ color: '#10B981', background: '#1E293B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{sizeLabels[s]}</TableHead>
                  ))}
                  {sizes.map((s, i) => (
                    <TableHead key={`cmvb-${s}`} className={cn("text-center py-2", i === 0 && "border-l border-slate-700")} style={{ color: '#64748B', background: '#1E293B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{sizeLabels[s]}</TableHead>
                  ))}
                  {activeApps.map((app) =>
                    sizes.map((s, i) => (
                      <TableHead key={`ap-${app.key}-${s}`} className={cn("text-center py-2", i === 0 && "border-l border-slate-700")} style={{ color: '#64748B', background: '#1E293B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{sizeLabels[s]}</TableHead>
                    ))
                  )}
                  {activeApps.map((app) =>
                    sizes.map((s, i) => (
                      <TableHead key={`ca-${app.key}-${s}`} className={cn("text-center py-2", i === 0 && "border-l border-slate-700")} style={{ color: '#64748B', background: '#1E293B', fontSize: '10px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{sizeLabels[s]}</TableHead>
                    ))
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichas.map((ficha, rowIndex) => {
                  const custos = pizzaCustos[ficha.id] ?? { p: 0, m: 0, g: 0 };
                  const precos = { p: getPreco(ficha.id, "p", ficha), m: getPreco(ficha.id, "m", ficha), g: getPreco(ficha.id, "g", ficha) };
                  const cmvs = { p: calcCmv(custos.p, precos.p), m: calcCmv(custos.m, precos.m), g: calcCmv(custos.g, precos.g) };
                  const sugeridos = { p: cmvMeta > 0 ? custos.p / (cmvMeta / 100) : 0, m: cmvMeta > 0 ? custos.m / (cmvMeta / 100) : 0, g: cmvMeta > 0 ? custos.g / (cmvMeta / 100) : 0 };
                  const hasAlert = cmvs.p > 40 || cmvs.m > 40 || cmvs.g > 40;

                  return (
                    <TableRow
                      key={ficha.id}
                      className={cn(
                        "row-reveal transition-all duration-200 hover:bg-accent/5 border-b border-border/50",
                        hasAlert && "bg-destructive/[0.03]"
                      )}
                      style={{ animationDelay: `${rowIndex * 50}ms` }}
                    >
                      {/* Pizza name — Display font */}
                      <TableCell className="py-5 px-5">
                        <div className="flex items-center gap-2.5">
                          {hasAlert && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                          <span className="font-display font-extrabold text-[15px] text-foreground truncate">{ficha.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-3">
                        <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{tipoLabel(ficha.tipo)}</span>
                      </TableCell>

                      {/* Custo — Terminal font */}
                      {sizes.map((s, i) => (
                        <TableCell key={`c-${s}`} className={cn("text-center py-5 px-2", i === 0 && "border-l border-border/50")} style={{ background: 'hsl(var(--secondary) / 0.5)' }}>
                          <span className="text-[10px] text-muted-foreground mr-0.5">R$</span>
                          <span className="text-[14px] font-bold font-terminal text-foreground/80">{custos[s].toFixed(2)}</span>
                        </TableCell>
                      ))}

                      {/* Sugerido — Terminal font */}
                      {sizes.map((s, i) => (
                        <TableCell key={`sug-${s}`} className={cn("text-center py-5 px-2", i === 0 && "border-l border-border/50")} style={{ background: 'hsl(var(--secondary) / 0.5)' }}>
                          <span className="text-[10px] text-muted-foreground mr-0.5">R$</span>
                          <span className="text-[14px] font-bold font-terminal text-foreground/80">{sugeridos[s].toFixed(2)}</span>
                        </TableCell>
                      ))}

                      {/* Seu Preço — Industrial inputs with glow */}
                      {sizes.map((s, i) => {
                        const fieldKey = `${ficha.id}-${s}`;
                        const cmv = cmvs[s];
                        const preco = precos[s];
                        const sug = sugeridos[s];
                        const borderColor = preco <= 0 ? 'hsl(var(--border))' : cmv > 35 ? '#EF4444' : cmv > 30 ? '#F59E0B' : '#10B981';
                        const glowColor = preco <= 0 ? 'transparent' : cmv > 35 ? 'rgba(239,68,68,0.12)' : cmv > 30 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)';
                        const belowSuggested = preco > 0 && sug > 0 && preco < sug;
                        return (
                          <TableCell key={`pr-${s}`} className={cn("py-3 px-1.5", i === 0 && "border-l border-border/50")} style={{ background: 'hsl(var(--card))' }}>
                            <div className="relative flex items-center justify-center">
                              <input
                                type={localPrices[ficha.id]?.[s] !== undefined ? "number" : "text"}
                                step={localPrices[ficha.id]?.[s] !== undefined ? "0.01" : undefined}
                                className="input-glow-focus w-full text-center rounded-xs outline-none font-terminal"
                                style={{
                                  height: '44px',
                                  fontSize: '16px',
                                  fontWeight: 700,
                                  fontFeatureSettings: "'tnum'",
                                  color: 'hsl(var(--foreground))',
                                  background: 'hsl(var(--card))',
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
                                placeholder="0,00"
                              />
                              {savedFields[fieldKey] && (
                                <Check className="absolute right-1.5 h-4 w-4 text-primary animate-in fade-in duration-200" />
                              )}
                              {belowSuggested && !savedFields[fieldKey] && (
                                <span className="absolute -right-0.5 -top-1.5 text-[11px]" title="Preço abaixo do sugerido">⚠️</span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}

                      {/* CMV Balcão — Glowing pills */}
                      {sizes.map((s, i) => {
                        const cmv = cmvs[s];
                        const pill = getCmvPillStyle(cmv);
                        return (
                          <TableCell key={`cmvb-${s}`} className={cn("text-center py-5 px-1.5", i === 0 && "border-l border-border/50")}>
                            {precos[s] > 0 ? (
                              <span
                                className="pill-glow inline-block text-[12px] font-bold px-3 py-1.5 rounded-full min-w-[52px] font-terminal cursor-default"
                                style={{
                                  background: pill.bg,
                                  color: '#FFFFFF',
                                  fontFeatureSettings: "'tnum'",
                                  boxShadow: `0 2px 8px ${pill.glow}`,
                                }}
                              >
                                {fmtPct(cmv)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        );
                      })}

                      {/* App prices */}
                      {activeApps.map((app) =>
                        sizes.map((s, i) => {
                          const appPrice = precos[s] > 0 ? calcAppPrice(precos[s], app.taxa) : 0;
                          return (
                            <TableCell key={`ap-${app.key}-${s}`} className={cn("text-center py-5 px-1.5", i === 0 && "border-l border-border/50")} style={{ background: 'hsl(var(--secondary) / 0.3)' }}>
                              {precos[s] > 0 ? (
                                <span className="text-[13px] font-bold font-terminal text-foreground">{appPrice.toFixed(2)}</span>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                          );
                        })
                      )}

                      {/* CMV App — Glowing pills */}
                      {activeApps.map((app) =>
                        sizes.map((s, i) => {
                          const appPrice = precos[s] > 0 ? calcAppPrice(precos[s], app.taxa) : 0;
                          const appCmv = calcCmv(custos[s], appPrice);
                          const pill = getCmvPillStyle(appCmv);
                          return (
                            <TableCell key={`ca-${app.key}-${s}`} className={cn("text-center py-5 px-1.5", i === 0 && "border-l border-border/50")}>
                              {appPrice > 0 ? (
                                <span
                                  className="pill-glow inline-block text-[12px] font-bold px-3 py-1.5 rounded-full min-w-[52px] font-terminal cursor-default"
                                  style={{
                                    background: pill.bg,
                                    color: '#FFFFFF',
                                    fontFeatureSettings: "'tnum'",
                                    boxShadow: `0 2px 8px ${pill.glow}`,
                                  }}
                                >
                                  {fmtPct(appCmv)}
                                </span>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </TableCell>
                          );
                        })
                      )}
                    </TableRow>
                  );
                })}
                {fichas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8 + 6 * appCount} className="text-center py-20">
                      <div className="flex flex-col items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                          <Activity className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-sm font-display font-semibold">Nenhuma pizza cadastrada ainda.</p>
                        <Button
                          onClick={() => window.location.href = '/fichas/pizzas?tipo=tradicional'}
                          className="btn-micro gap-2"
                        >
                          <span className="text-lg leading-none">+</span> Cadastrar Primeira Pizza
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
