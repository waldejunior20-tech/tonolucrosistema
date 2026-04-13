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
import { Settings2, Save, AlertTriangle, Check } from "lucide-react";
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

  // Sizes array
  const sizes = ["p", "m", "g"] as const;
  const sizeLabels = { p: "P", m: "M", g: "G" };

  // Number of app columns (each has 3 sub-cols for P/M/G)
  const appCount = activeApps.length;

  return (
    <TooltipProvider>
      <div className="space-y-6 page-enter">
        {/* Header */}
        <PageHeader title="Precificação de Pizzas" description="Gestão de margem por tamanho">
          <button
            onClick={() => {
              setConfigForm(config ?? null);
              setConfigOpen(!configOpen);
            }}
            className="flex items-center gap-2 px-4 h-9 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            <span>Configurações</span>
          </button>
        </PageHeader>

        {/* Config panel */}
        {configOpen && configForm && (
          <Card className="border-primary/30">
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
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={configForm[key] as number}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, [key]: parseFloat(e.target.value) || 0 })
                      }
                      disabled={key === "taxa_pix_pct"}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={() => configMutation.mutate(configForm)}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-fade-in">
          <div className="card-premium p-7">
            <p className="label-upper mb-4">CMV Médio Atual</p>
            <p className={cn("kpi-number", cmvColor(indicators.avgCmv))}>
              {fmtPct(indicators.avgCmv)}
            </p>
            <p className="text-sm text-muted-foreground font-medium mt-2">Média entre todos os tamanhos</p>
          </div>
          <div className="card-premium p-7">
            <p className="label-upper mb-4">Semáforo de Saúde</p>
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-5 w-5 rounded-full",
                indicators.avgCmv > 40 ? "bg-destructive" : indicators.avgCmv > 35 ? "bg-warning" : "bg-[#10B981]"
              )} />
              <span className={cn("text-xl font-extrabold uppercase", cmvColor(indicators.avgCmv))}>
                {cmvMessage(indicators.avgCmv)}
              </span>
            </div>
          </div>
          <div className="rounded-2xl p-7 border border-destructive/20" style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.06), rgba(185,28,28,0.1))' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm font-bold uppercase tracking-wider text-destructive">Pizzas Fora da Meta</p>
            </div>
            <p className="kpi-number text-destructive">{indicators.foraMetaCount}</p>
            <p className="text-sm text-destructive/70 font-medium mt-2">Tamanhos com CMV acima de 40%</p>
          </div>
        </div>

        {/* Pizza pricing table */}
        <Card className="overflow-hidden border-0 shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b-0" style={{ background: '#1F2937' }}>
                    <TableHead rowSpan={2} className="align-bottom text-white font-bold text-xs uppercase tracking-wider w-[160px] py-4 px-5">Pizza</TableHead>
                    <TableHead rowSpan={2} className="align-bottom text-white font-bold text-xs uppercase tracking-wider w-[80px] py-4">Tipo</TableHead>
                    <TableHead colSpan={3} className="text-center border-l border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3">Custo</TableHead>
                    <TableHead colSpan={3} className="text-center border-l border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3">Sugerido</TableHead>
                    <TableHead colSpan={3} className="text-center border-l border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3" style={{ background: 'rgba(255,140,0,0.15)' }}>
                      ✏️ Seu Preço
                    </TableHead>
                    <TableHead colSpan={3} className="text-center border-l border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3">CMV Balcão</TableHead>
                    {activeApps.map((app) => (
                      <TableHead key={`app-${app.key}`} colSpan={3} className="text-center border-l border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{app.label}</span>
                          </TooltipTrigger>
                          <TooltipContent><p className="max-w-[200px] text-xs">{APP_TOOLTIP}</p></TooltipContent>
                        </Tooltip>
                      </TableHead>
                    ))}
                    {activeApps.map((app) => (
                      <TableHead key={`cmv-${app.key}`} colSpan={3} className="text-center border-l border-white/10 text-white font-bold text-xs uppercase tracking-wider py-3">
                        CMV {app.label}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow style={{ background: '#1F2937' }}>
                    {/* Custo P/M/G */}
                    {sizes.map((s, i) => (
                      <TableHead key={`c-${s}`} className={cn("text-center text-[11px] text-white/70 font-bold py-2", i === 0 && "border-l border-white/10")}>{sizeLabels[s]}</TableHead>
                    ))}
                    {/* Sugerido P/M/G */}
                    {sizes.map((s, i) => (
                      <TableHead key={`sug-${s}`} className={cn("text-center text-[11px] text-white/70 font-bold py-2", i === 0 && "border-l border-white/10")}>{sizeLabels[s]}</TableHead>
                    ))}
                    {/* Seu Preço P/M/G */}
                    {sizes.map((s, i) => (
                      <TableHead key={`pr-${s}`} className={cn("text-center text-[11px] text-white/70 font-bold py-2", i === 0 && "border-l border-white/10")} style={{ background: 'rgba(255,140,0,0.15)' }}>{sizeLabels[s]}</TableHead>
                    ))}
                    {/* CMV Balcão P/M/G */}
                    {sizes.map((s, i) => (
                      <TableHead key={`cmvb-${s}`} className={cn("text-center text-[11px] text-white/70 font-bold py-2", i === 0 && "border-l border-white/10")}>{sizeLabels[s]}</TableHead>
                    ))}
                    {/* App prices P/M/G */}
                    {activeApps.map((app) =>
                      sizes.map((s, i) => (
                        <TableHead key={`ap-${app.key}-${s}`} className={cn("text-center text-[11px] text-white/70 font-bold py-2", i === 0 && "border-l border-white/10")}>{sizeLabels[s]}</TableHead>
                      ))
                    )}
                    {/* CMV App P/M/G */}
                    {activeApps.map((app) =>
                      sizes.map((s, i) => (
                        <TableHead key={`ca-${app.key}-${s}`} className={cn("text-center text-[11px] text-white/70 font-bold py-2", i === 0 && "border-l border-white/10")}>{sizeLabels[s]}</TableHead>
                      ))
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fichas.map((ficha) => {
                    const custos = pizzaCustos[ficha.id] ?? { p: 0, m: 0, g: 0 };
                    const precos = { p: getPreco(ficha.id, "p", ficha), m: getPreco(ficha.id, "m", ficha), g: getPreco(ficha.id, "g", ficha) };
                    const cmvs = { p: calcCmv(custos.p, precos.p), m: calcCmv(custos.m, precos.m), g: calcCmv(custos.g, precos.g) };
                    const sugeridos = { p: cmvMeta > 0 ? custos.p / (cmvMeta / 100) : 0, m: cmvMeta > 0 ? custos.m / (cmvMeta / 100) : 0, g: cmvMeta > 0 ? custos.g / (cmvMeta / 100) : 0 };
                    const hasAlert = cmvs.p > 40 || cmvs.m > 40 || cmvs.g > 40;

                    return (
                      <TableRow key={ficha.id} className={cn("transition-colors hover:bg-muted/30", hasAlert && "bg-red-50/50")}>
                        {/* Pizza name — bold, dark */}
                        <TableCell className="py-5 px-5">
                          <div className="flex items-center gap-2">
                            {hasAlert && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                            <span className="font-bold text-[15px] text-[#111827] truncate">{ficha.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium py-5 px-3">{tipoLabel(ficha.tipo)}</TableCell>

                        {/* Custo — read-only, gray bg */}
                        {sizes.map((s, i) => (
                          <TableCell key={`c-${s}`} className={cn("text-center py-5 px-2 bg-[#F9FAFB]", i === 0 && "border-l border-border/50")}>
                            <span className="text-xs text-muted-foreground">R$</span>{' '}
                            <span className="text-sm font-bold text-[#111827] tabular-nums">{custos[s].toFixed(2)}</span>
                          </TableCell>
                        ))}

                        {/* Sugerido — read-only, gray bg */}
                        {sizes.map((s, i) => (
                          <TableCell key={`sug-${s}`} className={cn("text-center py-5 px-2 bg-[#F9FAFB]", i === 0 && "border-l border-border/50")}>
                            <span className="text-xs text-muted-foreground">R$</span>{' '}
                            <span className="text-sm font-semibold text-muted-foreground tabular-nums">{sugeridos[s].toFixed(2)}</span>
                          </TableCell>
                        ))}

                        {/* Seu Preço — editable, white bg, orange border, green value */}
                        {sizes.map((s, i) => {
                          const fieldKey = `${ficha.id}-${s}`;
                          return (
                            <TableCell key={`pr-${s}`} className={cn("py-3 px-1", i === 0 && "border-l border-border/50")} style={{ background: '#FFFFFF' }}>
                              <div className="relative flex items-center justify-center">
                                <input
                                  type={localPrices[ficha.id]?.[s] !== undefined ? "number" : "text"}
                                  step={localPrices[ficha.id]?.[s] !== undefined ? "0.01" : undefined}
                                  className="w-full text-center font-bold tabular-nums rounded-lg transition-all duration-200 outline-none"
                                  style={{
                                    height: '44px',
                                    fontSize: '18px',
                                    color: '#059669',
                                    background: '#FFFFFF',
                                    border: '2px solid #F27121',
                                    borderImage: 'linear-gradient(135deg, #FF8C00, #F27121) 1',
                                  }}
                                  onFocus={(e) => {
                                    e.currentTarget.style.borderImage = 'none';
                                    e.currentTarget.style.borderColor = '#10B981';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2), 0 0 12px rgba(16,185,129,0.15)';
                                    e.currentTarget.select();
                                    if (localPrices[ficha.id]?.[s] === undefined) {
                                      handlePriceChange(ficha.id, s, String(ficha[`preco_venda_${s}` as keyof FichaPizza] ?? ""));
                                    }
                                  }}
                                  onBlur={(e) => {
                                    e.currentTarget.style.borderImage = 'linear-gradient(135deg, #FF8C00, #F27121) 1';
                                    e.currentTarget.style.borderColor = '';
                                    e.currentTarget.style.boxShadow = 'none';
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
                                  <Check className="absolute right-1 h-4 w-4 text-emerald-500 animate-in fade-in duration-200" />
                                )}
                              </div>
                            </TableCell>
                          );
                        })}

                        {/* CMV Balcão — semantic pills */}
                        {sizes.map((s, i) => (
                          <TableCell key={`cmvb-${s}`} className={cn("text-center py-5 px-2", i === 0 && "border-l border-border/50")}>
                            {precos[s] > 0 ? (
                              <span className={cn("inline-block text-xs font-bold px-2.5 py-1 rounded-full tabular-nums", cmvBg(cmvs[s]))}>
                                {fmtPct(cmvs[s])}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        ))}

                        {/* App prices */}
                        {activeApps.map((app) =>
                          sizes.map((s, i) => {
                            const appPrice = precos[s] > 0 ? calcAppPrice(precos[s], app.taxa) : 0;
                            return (
                              <TableCell key={`ap-${app.key}-${s}`} className={cn("text-center py-5 px-2 bg-[#F9FAFB]", i === 0 && "border-l border-border/50")}>
                                {precos[s] > 0 ? (
                                  <>
                                    <span className="text-xs text-muted-foreground">R$</span>{' '}
                                    <span className="text-sm font-bold text-[#111827] tabular-nums">{appPrice.toFixed(2)}</span>
                                  </>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            );
                          })
                        )}

                        {/* CMV App — semantic pills */}
                        {activeApps.map((app) =>
                          sizes.map((s, i) => {
                            const appPrice = precos[s] > 0 ? calcAppPrice(precos[s], app.taxa) : 0;
                            const appCmv = calcCmv(custos[s], appPrice);
                            return (
                              <TableCell key={`ca-${app.key}-${s}`} className={cn("text-center py-5 px-2", i === 0 && "border-l border-border/50")}>
                                {appPrice > 0 ? (
                                  <span className={cn("inline-block text-xs font-bold px-2.5 py-1 rounded-full tabular-nums", cmvBg(appCmv))}>
                                    {fmtPct(appCmv)}
                                  </span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            );
                          })
                        )}
                      </TableRow>
                    );
                  })}
                  {fichas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8 + 6 * appCount} className="text-center py-16">
                        <div className="flex flex-col items-center gap-4">
                          <p className="text-muted-foreground text-base">Nenhuma pizza cadastrada ainda.</p>
                          <Button
                            onClick={() => window.location.href = '/fichas/pizzas?tipo=tradicional'}
                            className="gap-2"
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
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
