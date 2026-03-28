import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, Beer, GlassWater, Check } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";

// ─── Types ───────────────────────────────────────────────────────────
interface InsumoComprado {
  id: string;
  nome: string;
  preco_pago: number;
  quantidade: number;
  unidade: string;
  categoria: string;
}

interface PrecificacaoBebida {
  id: string;
  insumo_comprado_id: string;
  preco_venda: number;
}

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

interface ConfigPrecificacao {
  id: string;
  custos_fixos_pct: number;
  cmv_meta_pct: number;
  taxa_ifood_pct: number;
  taxa_debito_pct: number;
  taxa_credito_pct: number;
  taxa_pix_pct: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const converterQuantidade = (qtd: number, unidade: string) =>
  unidade === "g" || unidade === "ml" ? qtd / 1000 : qtd;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ─── Faixas CMV para bebidas PREPARADAS (padrão Abrasel) ─────────
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

// ─── Faixas CMV para bebidas INDUSTRIALIZADAS ────────────────────
const indCmvColor = (pct: number): string => {
  if (pct < 75) return "text-blue-600";
  if (pct <= 85) return "text-green-600";
  if (pct <= 92) return "text-yellow-600";
  return "text-red-600";
};
const indCmvBg = (pct: number): string => {
  if (pct < 75) return "bg-blue-100 text-blue-800";
  if (pct <= 85) return "bg-green-100 text-green-800";
  if (pct <= 92) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
};
const indCmvEmoji = (pct: number): string => {
  if (pct < 75) return "🔵";
  if (pct <= 85) return "🟢";
  if (pct <= 92) return "🟡";
  return "🔴";
};
const indCmvMessage = (pct: number): string => {
  if (pct < 75) return "Ótima margem — acima do mercado";
  if (pct <= 85) return "Margem normal para revenda";
  if (pct <= 92) return "Atenção — margem muito apertada";
  return "Prejuízo — rever preço";
};

const calcCmv = (custo: number, preco: number) =>
  preco > 0 ? (custo / preco) * 100 : 0;

// ─── Component ───────────────────────────────────────────────────────
export default function PrecificacaoBebidas() {
  const queryClient = useQueryClient();
  const [localPricesInd, setLocalPricesInd] = useState<Record<string, string>>({});
  const [localPricesPrep, setLocalPricesPrep] = useState<Record<string, string>>({});
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
      const { data, error } = await supabase
        .from("fichas_tecnicas_produtos")
        .select("*")
        .eq("categoria", "bebidas")
        .order("nome");
      if (error) throw error;
      return data as FichaProduto[];
    },
  });

  const { data: ingredientesProdutos = [] } = useQuery({
    queryKey: ["fichas_tecnicas_produtos_ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_produtos_ingredientes")
        .select("*");
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

  // ─── Prepared beverage costs ─────────────────────────────────────
  const custoPrepMap = useMemo(() => {
    const m = new Map<string, number>();
    fichasBebidas.forEach((f) => {
      const ings = ingredientesProdutos.filter((i) => i.ficha_id === f.id);
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

  // ─── Indicators (separados por tipo) ──────────────────────────────
  const indIndicators = useMemo(() => {
    let totalCmv = 0;
    let count = 0;
    let foraMetaCount = 0;

    bebidasIndustrializadas.forEach((b) => {
      const custo = Number(b.preco_pago) / Number(b.quantidade);
      const preco = getPrecoInd(b.id);
      if (preco > 0) {
        const cmv = calcCmv(custo, preco);
        totalCmv += cmv;
        count++;
        if (cmv > 92) foraMetaCount++;
      }
    });

    const avgCmv = count > 0 ? totalCmv / count : 0;
    return { avgCmv, foraMetaCount };
  }, [bebidasIndustrializadas, getPrecoInd]);

  const prepIndicators = useMemo(() => {
    let totalCmv = 0;
    let count = 0;
    let foraMetaCount = 0;

    fichasBebidas.forEach((f) => {
      const custo = custoPrepMap.get(f.id) ?? 0;
      const preco = getPrecoPrep(f.id, f);
      if (preco > 0) {
        const cmv = calcCmv(custo, preco);
        totalCmv += cmv;
        count++;
        if (cmv > 40) foraMetaCount++;
      }
    });

    const avgCmv = count > 0 ? totalCmv / count : 0;
    return { avgCmv, foraMetaCount };
  }, [bebidasIndustrializadas, fichasBebidas, custoPrepMap, getPrecoInd, getPrecoPrep]);

  // ─── Mutations ───────────────────────────────────────────────────
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
          const { error } = await supabase
            .from("precificacao_bebidas")
            .update({ preco_venda: numVal })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("precificacao_bebidas")
            .insert({ insumo_comprado_id: insumoId, preco_venda: numVal });
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
        const { error } = await supabase
          .from("fichas_tecnicas_produtos")
          .update({ preco_venda: numVal || null })
          .eq("id", fichaId);
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
  const taxaIfood = config?.taxa_ifood_pct ?? 12;
  const taxaDebito = config?.taxa_debito_pct ?? 1.35;
  const taxaCredito = config?.taxa_credito_pct ?? 3.15;

  const lucro = (preco: number, custo: number, taxaPct: number) =>
    preco - custo - preco * (taxaPct / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-foreground">Precificação de Bebidas</h1>

      {/* Indicators — Industrializadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CMV Médio — Industrializadas</p>
            <p className={`text-3xl font-bold ${indCmvColor(indIndicators.avgCmv)}`}>
              {fmtPct(indIndicators.avgCmv)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Semáforo — Industrializadas</p>
            <p className="text-3xl">
              {indCmvEmoji(indIndicators.avgCmv)}{" "}
              <span className={`text-lg font-semibold ${indCmvColor(indIndicators.avgCmv)}`}>
                {indCmvMessage(indIndicators.avgCmv)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fora da Meta</p>
            <p className="text-3xl font-bold text-foreground flex items-center gap-2">
              {indIndicators.foraMetaCount + prepIndicators.foraMetaCount}
              {(indIndicators.foraMetaCount + prepIndicators.foraMetaCount) > 0 && (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="industrializadas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="industrializadas" className="gap-2">
            <Beer className="h-4 w-4" />
            Industrializadas
          </TabsTrigger>
          <TabsTrigger value="preparadas" className="gap-2">
            <GlassWater className="h-4 w-4" />
            Preparadas
          </TabsTrigger>
        </TabsList>

        {/* ─── Industrializadas ─────────────────────────────────── */}
        <TabsContent value="industrializadas">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bebidas Industrializadas</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cadastradas em Insumos Comprados (categoria Bebidas). Sem ficha técnica — CMV = custo ÷ preço de venda.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Bebida</TableHead>
                      <TableHead className="text-center">Custo Unit.</TableHead>
                      <TableHead className="text-center">Preço Praticado</TableHead>
                      <TableHead className="text-center">CMV %</TableHead>
                      <TableHead className="text-center">Preço Sugerido</TableHead>
                      <TableHead className="text-center">Lucro PIX</TableHead>
                      <TableHead className="text-center">Lucro Débito</TableHead>
                      <TableHead className="text-center">Lucro Crédito</TableHead>
                      <TableHead className="text-center">Lucro iFood</TableHead>
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
                        <TableRow key={bebida.id} className={hasAlert ? "bg-red-50/50" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {hasAlert && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              {bebida.nome}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs">{fmt(custoUnit)}</TableCell>
                          <TableCell>
                            <div className="relative flex items-center justify-center">
                              <span className="absolute left-2 text-xs font-semibold text-[#C0392B] pointer-events-none z-10">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 w-28 text-xs text-center pl-8 pr-6 border-b-2 border-b-[#C0392B] border-t-0 border-l-0 border-r-0 rounded-none bg-[#FEF2F2] focus-visible:ring-[#C0392B]/30"
                                value={localPricesInd[bebida.id] ?? (precificacaoMap.get(bebida.id)?.preco_venda ?? "")}
                                onChange={(e) =>
                                  setLocalPricesInd((prev) => ({ ...prev, [bebida.id]: e.target.value }))
                                }
                                onBlur={() => autoSaveInd(bebida.id)}
                                placeholder="0,00"
                              />
                              {savedFields[`ind-${bebida.id}`] && (
                                <Check className="absolute right-1 h-3.5 w-3.5 text-green-500 animate-in fade-in duration-200" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${indCmvBg(cmv)}`}>
                              {preco > 0 ? fmtPct(cmv) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">{fmt(sugerido)}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custoUnit, 0)) : "—"}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custoUnit, taxaDebito)) : "—"}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custoUnit, taxaCredito)) : "—"}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custoUnit, taxaIfood)) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {bebidasIndustrializadas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhuma bebida industrializada cadastrada. Cadastre em Insumos Comprados com categoria "Bebidas".
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Preparadas ───────────────────────────────────────── */}
        <TabsContent value="preparadas">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bebidas Preparadas</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cadastradas em Fichas Técnicas de Bebidas. O custo é calculado automaticamente pelos ingredientes.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Bebida</TableHead>
                      <TableHead className="text-center">Custo (Ficha)</TableHead>
                      <TableHead className="text-center">Preço Praticado</TableHead>
                      <TableHead className="text-center">CMV %</TableHead>
                      <TableHead className="text-center">Preço Sugerido</TableHead>
                      <TableHead className="text-center">Lucro PIX</TableHead>
                      <TableHead className="text-center">Lucro Débito</TableHead>
                      <TableHead className="text-center">Lucro Crédito</TableHead>
                      <TableHead className="text-center">Lucro iFood</TableHead>
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
                        <TableRow key={ficha.id} className={hasAlert ? "bg-red-50/50" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              {hasAlert && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              {ficha.nome}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs">{fmt(custo)}</TableCell>
                          <TableCell>
                            <div className="relative flex items-center justify-center">
                              <span className="absolute left-2 text-xs font-semibold text-[#C0392B] pointer-events-none z-10">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="h-8 w-28 text-xs text-center pl-8 pr-6 border-b-2 border-b-[#C0392B] border-t-0 border-l-0 border-r-0 rounded-none bg-[#FEF2F2] focus-visible:ring-[#C0392B]/30"
                                value={localPricesPrep[ficha.id] ?? (ficha.preco_venda ?? "")}
                                onChange={(e) =>
                                  setLocalPricesPrep((prev) => ({ ...prev, [ficha.id]: e.target.value }))
                                }
                                onBlur={() => autoSavePrep(ficha.id)}
                                placeholder="0,00"
                              />
                              {savedFields[`prep-${ficha.id}`] && (
                                <Check className="absolute right-1 h-3.5 w-3.5 text-green-500 animate-in fade-in duration-200" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cmvBg(cmv)}`}>
                              {preco > 0 ? fmtPct(cmv) : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">{fmt(sugerido)}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custo, 0)) : "—"}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custo, taxaDebito)) : "—"}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custo, taxaCredito)) : "—"}</TableCell>
                          <TableCell className="text-center text-xs">{preco > 0 ? fmt(lucro(preco, custo, taxaIfood)) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                    {fichasBebidas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhuma bebida preparada cadastrada. Cadastre fichas técnicas de bebidas primeiro.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
