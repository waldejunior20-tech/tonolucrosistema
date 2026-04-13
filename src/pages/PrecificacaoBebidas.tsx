import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AlertTriangle, Beer, GlassWater, Check } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";
import {
  fmt, fmtPct, calcCmv, converterQuantidade,
  cmvBg, cmvColor, cmvMessage,
  indCmvBg, indCmvColor, indCmvMessage,
  calcAppPrice, getActiveApps, APP_TOOLTIP,
  type ConfigPrecificacao,
} from "@/lib/pricing-helpers";
import { PageHeader } from "@/components/layout/PageHeader";

// ─── Types ───────────────────────────────────────────────────────────
interface InsumoComprado { id: string; nome: string; preco_pago: number; quantidade: number; unidade: string; categoria: string; }
interface PrecificacaoBebida { id: string; insumo_comprado_id: string; preco_venda: number; }
interface FichaProduto { id: string; nome: string; categoria: string; preco_venda: number | null; }
interface FichaProdutoIngrediente { ficha_id: string; tipo_insumo: string; insumo_comprado_id: string | null; insumo_proprio_id: string | null; quantidade: number; unidade: string; }
interface InsumoProprio { id: string; rendimento: number; }
interface InsumoProprioIngrediente { insumo_proprio_id: string | null; insumo_comprado_id: string | null; quantidade: number; unidade: string; }

// ─── Component ───────────────────────────────────────────────────────
export default function PrecificacaoBebidas() {
  const queryClient = useQueryClient();
  const [localPricesInd, setLocalPricesInd] = useState<Record<string, string>>({});
  const [localPricesPrep, setLocalPricesPrep] = useState<Record<string, string>>({});
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});

  const { data: config } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes_precificacao").select("*").limit(1).single();
      if (error) throw error;
      return data as ConfigPrecificacao;
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

  const bebidasIndustrializadas = useMemo(
    () => insumosComprados.filter((i) => i.categoria === "Bebidas"),
    [insumosComprados]
  );

  const { data: precificacoes = [] } = useQuery({
    queryKey: ["precificacao_bebidas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("precificacao_bebidas").select("*");
      if (error) throw error;
      return data as PrecificacaoBebida[];
    },
  });

  const precificacaoMap = useMemo(() => {
    const m = new Map<string, PrecificacaoBebida>();
    precificacoes.forEach((p) => m.set(p.insumo_comprado_id, p));
    return m;
  }, [precificacoes]);

  const { data: fichasBebidas = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos", "bebidas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_produtos").select("*").eq("categoria", "bebida").order("nome");
      if (error) throw error;
      return data as FichaProduto[];
    },
  });

  const { data: ingredientesProdutos = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_produtos_ingredientes").select("*");
      if (error) throw error;
      return data as FichaProdutoIngrediente[];
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

  const custoPrepMap = useMemo(() => {
    const m = new Map<string, number>();
    fichasBebidas.forEach((f) => {
      const ings = ingredientesProdutos.filter((i) => i.ficha_id === f.id);
      const custo = ings.reduce((acc, ing) => {
        const custoUnit = ing.tipo_insumo === "comprado"
          ? custoCompradoMap.get(ing.insumo_comprado_id ?? "") ?? 0
          : custoProprioMap.get(ing.insumo_proprio_id ?? "") ?? 0;
        return acc + custoUnit * converterQuantidade(Number(ing.quantidade), ing.unidade);
      }, 0);
      m.set(f.id, custo);
    });
    return m;
  }, [fichasBebidas, ingredientesProdutos, custoCompradoMap, custoProprioMap]);

  // ─── Price helpers ───────────────────────────────────────────────
  const getPrecoInd = useCallback(
    (insumoId: string) => {
      const local = localPricesInd[insumoId];
      if (local !== undefined && local !== "") return parseFloat(local);
      return Number(precificacaoMap.get(insumoId)?.preco_venda ?? 0);
    },
    [localPricesInd, precificacaoMap]
  );

  const getPrecoPrep = useCallback(
    (fichaId: string, ficha: FichaProduto) => {
      const local = localPricesPrep[fichaId];
      if (local !== undefined && local !== "") return parseFloat(local);
      return Number(ficha.preco_venda ?? 0);
    },
    [localPricesPrep]
  );

  // ─── Indicators ──────────────────────────────────────────────────
  const indIndicators = useMemo(() => {
    let totalCmv = 0, count = 0, foraMetaCount = 0;
    bebidasIndustrializadas.forEach((b) => {
      const custo = Number(b.preco_pago) / Number(b.quantidade);
      const preco = getPrecoInd(b.id);
      if (preco > 0) { const cmv = calcCmv(custo, preco); totalCmv += cmv; count++; if (cmv > 92) foraMetaCount++; }
    });
    return { avgCmv: count > 0 ? totalCmv / count : 0, foraMetaCount };
  }, [bebidasIndustrializadas, getPrecoInd]);

  const prepIndicators = useMemo(() => {
    let totalCmv = 0, count = 0, foraMetaCount = 0;
    fichasBebidas.forEach((f) => {
      const custo = custoPrepMap.get(f.id) ?? 0;
      const preco = getPrecoPrep(f.id, f);
      if (preco > 0) { const cmv = calcCmv(custo, preco); totalCmv += cmv; count++; if (cmv > 40) foraMetaCount++; }
    });
    return { avgCmv: count > 0 ? totalCmv / count : 0, foraMetaCount };
  }, [fichasBebidas, custoPrepMap, getPrecoPrep]);

  // ─── Auto-save helpers ─────────────────────────────────────────
  const showSavedCheck = useCallback((key: string) => {
    setSavedFields((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setSavedFields((prev) => ({ ...prev, [key]: false })), 2000);
  }, []);

  const autoSaveInd = useCallback(
    async (insumoId: string) => {
      const local = localPricesInd[insumoId];
      if (local === undefined) return;
      const numVal = parseFloat(local) || 0;
      const existing = precificacaoMap.get(insumoId);
      try {
        if (existing) {
          const { error } = await supabase.from("precificacao_bebidas").update({ preco_venda: numVal }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("precificacao_bebidas").insert({ insumo_comprado_id: insumoId, preco_venda: numVal });
          if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ["precificacao_bebidas"] });
        showSavedCheck(`ind-${insumoId}`);
        setLocalPricesInd((prev) => { const copy = { ...prev }; delete copy[insumoId]; return copy; });
      } catch {
        toast.error("Erro ao salvar preço.");
      }
    },
    [localPricesInd, precificacaoMap, queryClient, showSavedCheck]
  );

  const autoSavePrep = useCallback(
    async (fichaId: string) => {
      const local = localPricesPrep[fichaId];
      if (local === undefined) return;
      const numVal = parseFloat(local) || 0;
      try {
        const { error } = await supabase.from("fichas_tecnicas_produtos").update({ preco_venda: numVal || null }).eq("id", fichaId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos"] });
        showSavedCheck(`prep-${fichaId}`);
        setLocalPricesPrep((prev) => { const copy = { ...prev }; delete copy[fichaId]; return copy; });
      } catch {
        toast.error("Erro ao salvar preço.");
      }
    },
    [localPricesPrep, queryClient, showSavedCheck]
  );

  const cmvMeta = config?.cmv_meta_pct ?? 32;
  const activeApps = getActiveApps(config);

  // ─── Shared render for a single-item table (industrialized or prepared) ───
  const renderIndTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">Bebida</TableHead>
          <TableHead className="text-center">Custo</TableHead>
          <TableHead className="text-center">Sugerido</TableHead>
          <TableHead className="text-center bg-white/10 text-white font-bold">Seu Preço</TableHead>
          <TableHead className="text-center bg-white/10 text-white font-bold">CMV Balcão</TableHead>
          {activeApps.map((app) => (
            <TableHead key={`app-${app.key}`} className="text-center">
              <Tooltip><TooltipTrigger asChild><span className="cursor-help">{app.label}</span></TooltipTrigger>
                <TooltipContent><p className="max-w-[200px] text-xs">{APP_TOOLTIP}</p></TooltipContent></Tooltip>
            </TableHead>
          ))}
          {activeApps.map((app) => (
            <TableHead key={`cmv-${app.key}`} className="text-center">CMV {app.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bebidasIndustrializadas.map((bebida) => {
          const custoUnit = Number(bebida.preco_pago) / Number(bebida.quantidade);
          const preco = getPrecoInd(bebida.id);
          const cmv = calcCmv(custoUnit, preco);
          const sugerido = custoUnit / 0.80;
          const hasAlert = cmv > 92 && preco > 0;

          return (
            <TableRow key={bebida.id} className={hasAlert ? "bg-destructive/5" : ""}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  {hasAlert && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                  {bebida.nome}
                </div>
              </TableCell>
              <TableCell className="text-center text-xs">{fmt(custoUnit)}</TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{fmt(sugerido)}</TableCell>
              <TableCell className="bg-primary/5">
                <div className="relative flex items-center justify-center">
                  <Input
                    type={localPricesInd[bebida.id] !== undefined ? "number" : "text"}
                    step={localPricesInd[bebida.id] !== undefined ? "0.01" : undefined}
                    className="h-8 w-28 text-xs text-center pr-6 border-b-2 border-b-primary border-t-0 border-l-0 border-r-0 rounded-none bg-transparent focus-visible:ring-primary/30"
                    value={
                      localPricesInd[bebida.id] !== undefined
                        ? localPricesInd[bebida.id]
                        : (precificacaoMap.get(bebida.id)?.preco_venda ? formatMoney(Number(precificacaoMap.get(bebida.id)?.preco_venda)) : "")
                    }
                    onChange={(e) => setLocalPricesInd((prev) => ({ ...prev, [bebida.id]: e.target.value }))}
                    onFocus={() => {
                      if (localPricesInd[bebida.id] === undefined) {
                        const v = precificacaoMap.get(bebida.id)?.preco_venda;
                        setLocalPricesInd((prev) => ({ ...prev, [bebida.id]: String(v ?? "") }));
                      }
                    }}
                    onBlur={() => autoSaveInd(bebida.id)}
                    placeholder="R$ 0,00"
                  />
                  {savedFields[`ind-${bebida.id}`] && (
                    <Check className="absolute right-1 h-3.5 w-3.5 text-success animate-in fade-in duration-200" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center bg-primary/5">
                <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", indCmvBg(cmv))}>
                  {preco > 0 ? fmtPct(cmv) : "—"}
                </span>
              </TableCell>
              {activeApps.map((app) => {
                const appPrice = preco > 0 ? calcAppPrice(preco, app.taxa) : 0;
                return (
                  <TableCell key={`app-${app.key}`} className="text-center text-xs text-muted-foreground">
                    {preco > 0 ? fmt(appPrice) : "—"}
                  </TableCell>
                );
              })}
              {activeApps.map((app) => {
                const appPrice = preco > 0 ? calcAppPrice(preco, app.taxa) : 0;
                const appCmv = calcCmv(custoUnit, appPrice);
                return (
                  <TableCell key={`cmv-${app.key}`} className="text-center">
                    <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", indCmvBg(appCmv))}>
                      {appPrice > 0 ? fmtPct(appCmv) : "—"}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
        {bebidasIndustrializadas.length === 0 && (
          <TableRow>
            <TableCell colSpan={5 + activeApps.length * 2} className="text-center py-8 text-muted-foreground">
              Nenhuma bebida industrializada cadastrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderPrepTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[200px]">Bebida</TableHead>
          <TableHead className="text-center">Custo</TableHead>
          <TableHead className="text-center">Sugerido</TableHead>
          <TableHead className="text-center bg-white/10 text-white font-bold">Seu Preço</TableHead>
          <TableHead className="text-center bg-white/10 text-white font-bold">CMV Balcão</TableHead>
          {activeApps.map((app) => (
            <TableHead key={`app-${app.key}`} className="text-center">
              <Tooltip><TooltipTrigger asChild><span className="cursor-help">{app.label}</span></TooltipTrigger>
                <TooltipContent><p className="max-w-[200px] text-xs">{APP_TOOLTIP}</p></TooltipContent></Tooltip>
            </TableHead>
          ))}
          {activeApps.map((app) => (
            <TableHead key={`cmv-${app.key}`} className="text-center">CMV {app.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {fichasBebidas.map((ficha) => {
          const custo = custoPrepMap.get(ficha.id) ?? 0;
          const preco = getPrecoPrep(ficha.id, ficha);
          const cmv = calcCmv(custo, preco);
          const sugerido = cmvMeta > 0 ? custo / (cmvMeta / 100) : 0;
          const hasAlert = cmv > 40 && preco > 0;

          return (
            <TableRow key={ficha.id} className={hasAlert ? "bg-destructive/5" : ""}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-1">
                  {hasAlert && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                  {ficha.nome}
                </div>
              </TableCell>
              <TableCell className="text-center text-xs">{fmt(custo)}</TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{fmt(sugerido)}</TableCell>
              <TableCell className="bg-primary/5">
                <div className="relative flex items-center justify-center">
                  <Input
                    type={localPricesPrep[ficha.id] !== undefined ? "number" : "text"}
                    step={localPricesPrep[ficha.id] !== undefined ? "0.01" : undefined}
                    className="h-8 w-28 text-xs text-center pr-6 border-b-2 border-b-primary border-t-0 border-l-0 border-r-0 rounded-none bg-transparent focus-visible:ring-primary/30"
                    value={
                      localPricesPrep[ficha.id] !== undefined
                        ? localPricesPrep[ficha.id]
                        : (ficha.preco_venda ? formatMoney(Number(ficha.preco_venda)) : "")
                    }
                    onChange={(e) => setLocalPricesPrep((prev) => ({ ...prev, [ficha.id]: e.target.value }))}
                    onFocus={() => {
                      if (localPricesPrep[ficha.id] === undefined) {
                        setLocalPricesPrep((prev) => ({ ...prev, [ficha.id]: String(ficha.preco_venda ?? "") }));
                      }
                    }}
                    onBlur={() => autoSavePrep(ficha.id)}
                    placeholder="R$ 0,00"
                  />
                  {savedFields[`prep-${ficha.id}`] && (
                    <Check className="absolute right-1 h-3.5 w-3.5 text-success animate-in fade-in duration-200" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center bg-primary/5">
                <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", cmvBg(cmv))}>
                  {preco > 0 ? fmtPct(cmv) : "—"}
                </span>
              </TableCell>
              {activeApps.map((app) => {
                const appPrice = preco > 0 ? calcAppPrice(preco, app.taxa) : 0;
                return (
                  <TableCell key={`app-${app.key}`} className="text-center text-xs text-muted-foreground">
                    {preco > 0 ? fmt(appPrice) : "—"}
                  </TableCell>
                );
              })}
              {activeApps.map((app) => {
                const appPrice = preco > 0 ? calcAppPrice(preco, app.taxa) : 0;
                const appCmv = calcCmv(custo, appPrice);
                return (
                  <TableCell key={`cmv-${app.key}`} className="text-center">
                    <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded", cmvBg(appCmv))}>
                      {appPrice > 0 ? fmtPct(appCmv) : "—"}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
        {fichasBebidas.length === 0 && (
          <TableRow>
            <TableCell colSpan={5 + activeApps.length * 2} className="text-center py-8 text-muted-foreground">
              Nenhuma bebida preparada cadastrada.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6 page-enter">
        <PageHeader title="Precificação de Bebidas" description="Defina preços e acompanhe o custo das suas bebidas." />

        {/* Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-fade-in">
          <div className="card-premium p-6">
            <p className="label-upper mb-4">Custo Médio — Industrializadas</p>
            <p className={cn("kpi-number", indCmvColor(indIndicators.avgCmv))}>
              {fmtPct(indIndicators.avgCmv)}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">
              {indIndicators.avgCmv > 92 ? "⚠️ Custo muito alto — revise os preços" : indIndicators.avgCmv > 85 ? "Atenção — custo no limite" : "✅ Custo saudável"}
            </p>
          </div>
          <div className="rounded-2xl p-6 border border-destructive/20" style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.06), rgba(185,28,28,0.1))' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Precisam de Atenção</p>
            </div>
            <p className="kpi-number text-destructive">
              {indIndicators.foraMetaCount + prepIndicators.foraMetaCount}
            </p>
            <p className="text-[11px] text-destructive/70 font-medium mt-1">Bebidas com custo acima da meta</p>
          </div>
        </div>

        <Tabs defaultValue="industrializadas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="industrializadas" className="gap-2"><Beer className="h-4 w-4" />Industrializadas</TabsTrigger>
            <TabsTrigger value="preparadas" className="gap-2"><GlassWater className="h-4 w-4" />Preparadas</TabsTrigger>
          </TabsList>

          <TabsContent value="industrializadas">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bebidas Industrializadas</CardTitle>
                <p className="text-xs text-muted-foreground">CMV = custo ÷ preço de venda.</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">{renderIndTable()}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preparadas">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bebidas Preparadas</CardTitle>
                <p className="text-xs text-muted-foreground">Custo calculado pela ficha técnica.</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">{renderPrepTable()}</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
