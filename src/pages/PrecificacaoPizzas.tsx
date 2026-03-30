import { useState, useMemo, useCallback, useRef } from "react";
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
import { toast } from "sonner";
import { Settings2, Save, AlertTriangle, Check } from "lucide-react";
import { formatMoney, parseFormattedNumber } from "@/components/MoneyInput";

// ─── Types ───────────────────────────────────────────────────────────
interface ConfigPrecificacao {
  id: string;
  custos_fixos_pct: number;
  cmv_meta_pct: number;
  taxa_ifood_pct: number;
  taxa_debito_pct: number;
  taxa_credito_pct: number;
  taxa_pix_pct: number;
}

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

// ─── Helpers ─────────────────────────────────────────────────────────
const converterQuantidade = (qtd: number, unidade: string) =>
  unidade === "g" || unidade === "ml" ? qtd / 1000 : qtd;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const cmvColor = (pct: number): string => {
  if (pct < 25) return "text-blue-600";
  if (pct <= 35) return "text-green-600";
  if (pct <= 40) return "text-yellow-600";
  return "text-red-600";
};

const cmvBg = (pct: number): string => {
  if (pct < 25) return "bg-blue-100 text-blue-800";
  if (pct <= 35) return "bg-green-100 text-green-800";
  if (pct <= 40) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};

const cmvEmoji = (pct: number): string => {
  if (pct < 25) return "🔵";
  if (pct <= 35) return "🟢";
  if (pct <= 40) return "🟡";
  return "🔴";
};

const cmvMessage = (pct: number): string => {
  if (pct < 25) return "Preço alto — verifique se está correto";
  if (pct <= 35) return "Ideal";
  if (pct <= 40) return "Atenção — margem apertada";
  return "Rever preços — prejuízo";
};

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
      const { data, error } = await supabase
        .from("fichas_tecnicas_pizza_ingredientes")
        .select("*");
      if (error) throw error;
      return data as Ingrediente[];
    },
  });

  const { data: insumosComprados = [] } = useQuery({
    queryKey: ["insumos_comprados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_comprados")
        .select("*");
      if (error) throw error;
      return data as InsumoComprado[];
    },
  });

  const { data: insumosProprios = [] } = useQuery({
    queryKey: ["insumos_proprios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_proprios")
        .select("*");
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
      return data as InsumoProprioIngrediente[];
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

  // ─── CMV calculation ────────────────────────────────────────────
  const calcCmv = (custo: number, preco: number) =>
    preco > 0 ? (custo / preco) * 100 : 0;

  // ─── Indicators ──────────────────────────────────────────────────
  const indicators = useMemo(() => {
    let totalCmv = 0;
    let count = 0;
    let foraMetaCount = 0;
    const cmvMeta = config?.cmv_meta_pct ?? 32;

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
  }, [fichas, pizzaCustos, getPreco, config]);

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
      const { error } = await supabase
        .from("fichas_tecnicas_pizza")
        .update({ [colMap[size]]: numVal || null })
        .eq("id", fichaId);
      if (error) {
        toast.error("Erro ao salvar preço.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      // Show check for 2 seconds
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
    if (local === undefined) return; // no change
    const original = String(ficha[`preco_venda_${size}` as keyof FichaPizza] ?? "");
    if (local === original) return; // no change
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
  const taxaIfood = config?.taxa_ifood_pct ?? 12;
  const taxaDebito = config?.taxa_debito_pct ?? 1.35;
  const taxaCredito = config?.taxa_credito_pct ?? 3.15;

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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-syne uppercase">Precificação de Pizzas</h1>
          <p className="text-text2 font-medium">Gestão de margem por tamanho</p>
        </div>
        <button
          onClick={() => {
            setConfigForm(config ?? null);
            setConfigOpen(!configOpen);
          }}
          className="btn-3d-ghost h-10 px-6 flex items-center gap-2"
        >
          <Settings2 className="h-4 w-4" />
          <span>Configurações</span>
        </button>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-premium p-6">
          <p className="label-upper mb-4">📊 CMV Médio Atual</p>
          <p className={cn("kpi-number", indicators.avgCmv > 40 ? "text-[#C0392B]" : indicators.avgCmv > 32 ? "text-[#F39C12]" : "text-[#27AE60]")}>
            {fmtPct(indicators.avgCmv)}
          </p>
          <p className="text-[11px] text-text3 font-medium mt-1">Média entre todos os tamanhos</p>
        </div>
        <div className="card-premium p-6">
          <p className="label-upper mb-4">🚦 Semáforo de Saúde</p>
          <div className="flex items-center gap-3">
            <div className={cn(
              "health-pulse",
              indicators.avgCmv > 40 ? "health-pulse" : indicators.avgCmv > 32 ? "health-pulse-amber" : "health-pulse-green",
              indicators.avgCmv > 40 ? "bg-[#C0392B]" : indicators.avgCmv > 32 ? "bg-[#F39C12]" : "bg-[#27AE60]"
            )} />
            <span className={cn("text-lg font-bold font-syne uppercase", indicators.avgCmv > 40 ? "text-[#C0392B]" : indicators.avgCmv > 32 ? "text-[#F39C12]" : "text-[#27AE60]")}>
              {cmvMessage(indicators.avgCmv)}
            </span>
          </div>
        </div>
        <div className="card-premium p-6">
          <p className="label-upper mb-4">⚠️ Pizzas Fora da Meta</p>
          <div className="flex items-center gap-3">
            <p className="kpi-number">{indicators.foraMetaCount}</p>
            {indicators.foraMetaCount > 0 && (
              <AlertTriangle className="h-6 w-6 text-[#C0392B]" />
            )}
          </div>
          <p className="text-[11px] text-text3 font-medium mt-1">Tamanhos com CMV acima de 40%</p>
        </div>
      </div>

      {/* Pizza pricing table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-bottom min-w-[180px]">Pizza</TableHead>
                  <TableHead rowSpan={2} className="align-bottom">Tipo</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Custo (Ficha Técnica)</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Preço Praticado</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">CMV %</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Preço Sugerido</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Lucro PIX</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Lucro Débito</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Lucro Crédito</TableHead>
                  <TableHead colSpan={3} className="text-center border-l">Lucro iFood</TableHead>
                  
                </TableRow>
                <TableRow>
                  {/* Custo */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* Preço */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* CMV */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* Sugerido */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* Lucro PIX */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* Lucro Débito */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* Lucro Crédito */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                  {/* Lucro iFood */}
                  <TableHead className="text-center border-l text-xs">P</TableHead>
                  <TableHead className="text-center text-xs">M</TableHead>
                  <TableHead className="text-center text-xs">G</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichas.map((ficha) => {
                  const custos = pizzaCustos[ficha.id] ?? { p: 0, m: 0, g: 0 };
                  const precoP = getPreco(ficha.id, "p", ficha);
                  const precoM = getPreco(ficha.id, "m", ficha);
                  const precoG = getPreco(ficha.id, "g", ficha);

                  const cmvP = calcCmv(custos.p, precoP);
                  const cmvM = calcCmv(custos.m, precoM);
                  const cmvG = calcCmv(custos.g, precoG);

                  const sugeridoP = cmvMeta > 0 ? custos.p / (cmvMeta / 100) : 0;
                  const sugeridoM = cmvMeta > 0 ? custos.m / (cmvMeta / 100) : 0;
                  const sugeridoG = cmvMeta > 0 ? custos.g / (cmvMeta / 100) : 0;

                  const lucro = (preco: number, custo: number, taxaPct: number) =>
                    preco - custo - preco * (taxaPct / 100);

                  const hasAlert = cmvP > 40 || cmvM > 40 || cmvG > 40;

                  return (
                    <TableRow key={ficha.id} className={hasAlert ? "bg-red-50/50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {hasAlert && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                          {ficha.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tipoLabel(ficha.tipo)}
                      </TableCell>

                      {/* Custo */}
                      <TableCell className="text-center border-l text-xs">{fmt(custos.p)}</TableCell>
                      <TableCell className="text-center text-xs">{fmt(custos.m)}</TableCell>
                      <TableCell className="text-center text-xs">{fmt(custos.g)}</TableCell>

                      {/* Preço Praticado (auto-save on blur) */}
                      {(["p", "m", "g"] as const).map((s, i) => {
                        const fieldKey = `${ficha.id}-${s}`;
                        return (
                          <TableCell key={s} className={`${i === 0 ? "border-l" : ""}`}>
                            <div className="relative flex items-center">
                              <Input
                                type={localPrices[ficha.id]?.[s] !== undefined ? "number" : "text"}
                                step={localPrices[ficha.id]?.[s] !== undefined ? "0.01" : undefined}
                                className="h-8 w-28 text-xs text-center pr-6 border-b-2 border-b-[#C0392B] border-t-0 border-l-0 border-r-0 rounded-none bg-[#FEF2F2] focus-visible:ring-[#C0392B]/30"
                                value={
                                  localPrices[ficha.id]?.[s] !== undefined
                                    ? localPrices[ficha.id][s]
                                    : (ficha[`preco_venda_${s}` as keyof FichaPizza]
                                      ? formatMoney(Number(ficha[`preco_venda_${s}` as keyof FichaPizza]))
                                      : "")
                                }
                                onChange={(e) => handlePriceChange(ficha.id, s, e.target.value)}
                                onFocus={() => {
                                  if (localPrices[ficha.id]?.[s] === undefined) {
                                    handlePriceChange(ficha.id, s, String(ficha[`preco_venda_${s}` as keyof FichaPizza] ?? ""));
                                  }
                                }}
                                onBlur={() => handlePriceBlur(ficha.id, s, ficha)}
                                placeholder="R$ 0,00"
                              />
                              {savedFields[fieldKey] && (
                                <Check className="absolute right-1 h-3.5 w-3.5 text-green-500 animate-in fade-in duration-200" />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}

                      {/* CMV % */}
                      {[cmvP, cmvM, cmvG].map((cmv, i) => (
                        <TableCell key={i} className={`text-center ${i === 0 ? "border-l" : ""}`}>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cmvBg(cmv)}`}>
                            {fmtPct(cmv)}
                          </span>
                        </TableCell>
                      ))}

                      {/* Preço Sugerido */}
                      <TableCell className="text-center border-l text-xs">{fmt(sugeridoP)}</TableCell>
                      <TableCell className="text-center text-xs">{fmt(sugeridoM)}</TableCell>
                      <TableCell className="text-center text-xs">{fmt(sugeridoG)}</TableCell>

                      {/* Lucro PIX */}
                      {([precoP, precoM, precoG] as const).map((preco, i) => (
                        <TableCell key={`pix-${i}`} className={`text-center text-xs ${i === 0 ? "border-l" : ""}`}>
                          {fmt(lucro(preco, [custos.p, custos.m, custos.g][i], 0))}
                        </TableCell>
                      ))}

                      {/* Lucro Débito */}
                      {([precoP, precoM, precoG] as const).map((preco, i) => (
                        <TableCell key={`deb-${i}`} className={`text-center text-xs ${i === 0 ? "border-l" : ""}`}>
                          {fmt(lucro(preco, [custos.p, custos.m, custos.g][i], taxaDebito))}
                        </TableCell>
                      ))}

                      {/* Lucro Crédito */}
                      {([precoP, precoM, precoG] as const).map((preco, i) => (
                        <TableCell key={`cred-${i}`} className={`text-center text-xs ${i === 0 ? "border-l" : ""}`}>
                          {fmt(lucro(preco, [custos.p, custos.m, custos.g][i], taxaCredito))}
                        </TableCell>
                      ))}

                      {/* Lucro iFood */}
                      {([precoP, precoM, precoG] as const).map((preco, i) => (
                        <TableCell key={`ifood-${i}`} className={`text-center text-xs ${i === 0 ? "border-l" : ""}`}>
                          {fmt(lucro(preco, [custos.p, custos.m, custos.g][i], taxaIfood))}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                {fichas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={27} className="text-center py-8 text-muted-foreground">
                      Nenhuma pizza cadastrada. Cadastre fichas técnicas primeiro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
