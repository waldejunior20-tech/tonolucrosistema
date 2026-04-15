import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AlertTriangle, Check } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";
import {
  fmt, fmtPct, calcCmv, converterQuantidade, cmvBg, cmvColor, cmvMessage,
  calcAppPrice, getActiveApps, APP_TOOLTIP,
  type ConfigPrecificacao,
} from "@/lib/pricing-helpers";
import { getOrCreateConfiguracoesPrecificacao } from "@/lib/config-helpers";

// ─── Types ───────────────────────────────────────────────────────────
interface FichaProduto {
  id: string;
  nome: string;
  categoria: string;
  preco_venda: number | null;
}

interface FichaProdutoIngrediente {
  ficha_id: string;
  tipo_insumo: string;
  insumo_comprado_id: string | null;
  insumo_proprio_id: string | null;
  quantidade: number;
  unidade: string;
}

interface InsumoComprado { id: string; preco_pago: number; quantidade: number; }
interface InsumoProprio { id: string; rendimento: number; }
interface InsumoProprioIngrediente { insumo_proprio_id: string | null; insumo_comprado_id: string | null; quantidade: number; unidade: string; }
interface PrecificacaoProduto { id: string; ficha_id: string; preco_venda: number; }

const categoriaLabel: Record<string, string> = {
  sanduiche: "Sanduíches e Lanches",
  prato: "Pratos",
  sobremesa: "Sobremesas",
};
const categoriaOrder = ["sanduiche", "prato", "sobremesa"];

// ─── Component ───────────────────────────────────────────────────────
export default function PrecificacaoProdutos() {
  const queryClient = useQueryClient();
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});

  const { data: config } = useQuery({
    queryKey: ["configuracoes_precificacao"],
    queryFn: getOrCreateConfiguracoesPrecificacao,
    retry: false,
  });

  const { data: fichas = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos", "precificacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_produtos")
        .select("*")
        .in("categoria", ["sanduiche", "prato", "sobremesa"])
        .order("categoria")
        .order("nome");
      if (error) throw error;
      return data as FichaProduto[];
    },
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas_tecnicas_produtos_ingredientes").select("*");
      if (error) throw error;
      return data as FichaProdutoIngrediente[];
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

  const { data: precificacoes = [] } = useQuery({
    queryKey: ["precificacao_produtos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("precificacao_produtos").select("*");
      if (error) throw error;
      return data as PrecificacaoProduto[];
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

  const custoMap = useMemo(() => {
    const m = new Map<string, number>();
    fichas.forEach((f) => {
      const ings = ingredientes.filter((i) => i.ficha_id === f.id);
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
  }, [fichas, ingredientes, custoCompradoMap, custoProprioMap]);

  const precificacaoMap = useMemo(() => {
    const m = new Map<string, PrecificacaoProduto>();
    precificacoes.forEach((p) => m.set(p.ficha_id, p));
    return m;
  }, [precificacoes]);

  const getPreco = useCallback(
    (fichaId: string) => {
      const local = localPrices[fichaId];
      if (local !== undefined && local !== "") return parseFloat(local);
      return Number(precificacaoMap.get(fichaId)?.preco_venda ?? 0);
    },
    [localPrices, precificacaoMap]
  );

  // ─── Indicators ──────────────────────────────────────────────────
  const indicators = useMemo(() => {
    let totalCmv = 0, count = 0, foraMetaCount = 0;
    fichas.forEach((f) => {
      const custo = custoMap.get(f.id) ?? 0;
      const preco = getPreco(f.id);
      if (preco > 0) {
        const cmv = calcCmv(custo, preco);
        totalCmv += cmv;
        count++;
        if (cmv > 40) foraMetaCount++;
      }
    });
    return { avgCmv: count > 0 ? totalCmv / count : 0, foraMetaCount };
  }, [fichas, custoMap, getPreco]);

  // ─── Auto-save ───────────────────────────────────────────────────
  const showSavedCheck = useCallback((key: string) => {
    setSavedFields((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setSavedFields((prev) => ({ ...prev, [key]: false })), 2000);
  }, []);

  const autoSave = useCallback(
    async (fichaId: string) => {
      const local = localPrices[fichaId];
      if (local === undefined) return;
      const numVal = parseFloat(local) || 0;
      const existing = precificacaoMap.get(fichaId);
      try {
        if (existing) {
          const { error } = await supabase.from("precificacao_produtos").update({ preco_venda: numVal }).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("precificacao_produtos").insert({ ficha_id: fichaId, preco_venda: numVal });
          if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ["precificacao_produtos"] });
        showSavedCheck(fichaId);
        setLocalPrices((prev) => { const copy = { ...prev }; delete copy[fichaId]; return copy; });
      } catch {
        appError("ERR-PRC-010");
      }
    },
    [localPrices, precificacaoMap, queryClient, showSavedCheck]
  );

  const cmvMeta = config?.cmv_meta_pct ?? 32;
  const activeApps = getActiveApps(config);

  const grouped = useMemo(() => {
    const groups: Record<string, FichaProduto[]> = {};
    fichas.forEach((f) => {
      if (!groups[f.categoria]) groups[f.categoria] = [];
      groups[f.categoria].push(f);
    });
    return groups;
  }, [fichas]);

  const renderTable = (items: FichaProduto[]) => (
    <div className="table-premium overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Produto</TableHead>
            <TableHead className="text-center">Custo</TableHead>
            <TableHead className="text-center">Sugerido</TableHead>
            <TableHead className="text-center ">Seu Preço</TableHead>
            <TableHead className="text-center ">CMV Balcão</TableHead>
            {activeApps.map((app) => (
              <TableHead key={`app-${app.key}`} className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{app.label}</span>
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-[200px] text-xs">{APP_TOOLTIP}</p></TooltipContent>
                </Tooltip>
              </TableHead>
            ))}
            {activeApps.map((app) => (
              <TableHead key={`cmv-${app.key}`} className="text-center">CMV {app.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((ficha) => {
            const custo = custoMap.get(ficha.id) ?? 0;
            const preco = getPreco(ficha.id);
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
                      type={localPrices[ficha.id] !== undefined ? "number" : "text"}
                      step={localPrices[ficha.id] !== undefined ? "0.01" : undefined}
                      className="h-8 w-28 text-xs text-center pr-6 border-b-2 border-b-primary border-t-0 border-l-0 border-r-0 rounded-none bg-transparent focus-visible:ring-primary/30"
                      value={
                        localPrices[ficha.id] !== undefined
                          ? localPrices[ficha.id]
                          : (precificacaoMap.get(ficha.id)?.preco_venda
                            ? formatMoney(Number(precificacaoMap.get(ficha.id)?.preco_venda))
                            : "")
                      }
                      onChange={(e) => setLocalPrices((prev) => ({ ...prev, [ficha.id]: e.target.value }))}
                      onFocus={() => {
                        if (localPrices[ficha.id] === undefined) {
                          const v = precificacaoMap.get(ficha.id)?.preco_venda;
                          setLocalPrices((prev) => ({ ...prev, [ficha.id]: String(v ?? "") }));
                        }
                      }}
                      onBlur={() => autoSave(ficha.id)}
                      placeholder="R$ 0,00"
                    />
                    {savedFields[ficha.id] && (
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
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5 + activeApps.length * 2} className="text-center py-8 text-muted-foreground">
                Nenhum produto cadastrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6 page-enter">
        <PageHeader title="Precificação de Produtos" description="Defina preços e acompanhe o custo de cada produto." />

        {/* Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger-fade-in">
          <div className="card-premium p-7">
            <p className="label-upper mb-4">Custo Médio dos Produtos</p>
            <p className={cn("kpi-number", cmvColor(indicators.avgCmv))}>
              {fmtPct(indicators.avgCmv)}
            </p>
            <p className="text-sm text-muted-foreground font-medium mt-2">
              {indicators.avgCmv > 40 ? "Custo alto — revise os preços" : indicators.avgCmv > 35 ? "Atenção — custo no limite" : "Custo saudável"}
            </p>
          </div>
          <div className="card-premium border-destructive/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm font-bold uppercase tracking-wider text-destructive">Precisam de Atenção</p>
            </div>
            <p className="kpi-number text-destructive">{indicators.foraMetaCount}</p>
            <p className="text-sm text-destructive/70 font-medium mt-2">Produtos com custo acima de 40%</p>
          </div>
        </div>

        {/* Grouped tables */}
        {categoriaOrder.map((cat) => {
          const items = grouped[cat] ?? [];
          return (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{categoriaLabel[cat]}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderTable(items)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
