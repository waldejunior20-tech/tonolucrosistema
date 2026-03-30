import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, Check } from "lucide-react";
import { formatMoney } from "@/components/MoneyInput";

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

interface ConfigPrecificacao {
  id: string;
  custos_fixos_pct: number;
  cmv_meta_pct: number;
  taxa_ifood_pct: number;
  taxa_debito_pct: number;
  taxa_credito_pct: number;
  taxa_pix_pct: number;
}

interface PrecificacaoProduto {
  id: string;
  ficha_id: string;
  preco_venda: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────
const converterQuantidade = (qtd: number, unidade: string) =>
  unidade === "g" || unidade === "ml" ? qtd / 1000 : qtd;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const cmvColor = (pct: number): string => {
  if (pct < 25) return "text-info";
  if (pct <= 35) return "text-success";
  if (pct <= 40) return "text-warning";
  return "text-destructive";
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

const calcCmv = (custo: number, preco: number) =>
  preco > 0 ? (custo / preco) * 100 : 0;

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
      const { data, error } = await supabase
        .from("fichas_tecnicas_produtos_ingredientes")
        .select("*");
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

  // ─── Product costs ──────────────────────────────────────────────
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

  // ─── Price helpers ───────────────────────────────────────────────
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
    let totalCmv = 0;
    let count = 0;
    let foraMetaCount = 0;

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

    const avgCmv = count > 0 ? totalCmv / count : 0;
    return { avgCmv, foraMetaCount };
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
          const { error } = await supabase
            .from("precificacao_produtos")
            .update({ preco_venda: numVal })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("precificacao_produtos")
            .insert({ ficha_id: fichaId, preco_venda: numVal });
          if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ["precificacao_produtos"] });
        showSavedCheck(fichaId);
        setLocalPrices((prev) => { const copy = { ...prev }; delete copy[fichaId]; return copy; });
      } catch {
        toast.error("Erro ao salvar preço.");
      }
    },
    [localPrices, precificacaoMap, queryClient, showSavedCheck]
  );

  const cmvMeta = config?.cmv_meta_pct ?? 32;
  const taxaIfood = config?.taxa_ifood_pct ?? 12;
  const taxaDebito = config?.taxa_debito_pct ?? 1.35;
  const taxaCredito = config?.taxa_credito_pct ?? 3.15;

  const lucro = (preco: number, custo: number, taxaPct: number) =>
    preco - custo - preco * (taxaPct / 100);

  // ─── Group by category ──────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, FichaProduto[]> = {};
    fichas.forEach((f) => {
      if (!groups[f.categoria]) groups[f.categoria] = [];
      groups[f.categoria].push(f);
    });
    return groups;
  }, [fichas]);

  const renderTable = (items: FichaProduto[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Produto</TableHead>
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
          {items.map((ficha) => {
            const custo = custoMap.get(ficha.id) ?? 0;
            const preco = getPreco(ficha.id);
            const cmv = calcCmv(custo, preco);
            const sugerido = cmvMeta > 0 ? custo / (cmvMeta / 100) : 0;
            const hasAlert = cmv > 40 && preco > 0;

            return (
              <TableRow key={ficha.id} className={hasAlert ? "bg-red-50/50" : ""}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1">
                    {hasAlert && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    {ficha.nome}
                  </div>
                </TableCell>
                <TableCell className="text-center text-xs">{fmt(custo)}</TableCell>
                <TableCell>
                  <div className="relative flex items-center justify-center">
                    <Input
                      type={localPrices[ficha.id] !== undefined ? "number" : "text"}
                      step={localPrices[ficha.id] !== undefined ? "0.01" : undefined}
                      className="h-8 w-28 text-xs text-center pr-6 border-b-2 border-b-primary border-t-0 border-l-0 border-r-0 rounded-none bg-primary/5 focus-visible:ring-primary/30"
                      value={
                        localPrices[ficha.id] !== undefined
                          ? localPrices[ficha.id]
                          : (precificacaoMap.get(ficha.id)?.preco_venda
                            ? formatMoney(Number(precificacaoMap.get(ficha.id)?.preco_venda))
                            : "")
                      }
                      onChange={(e) =>
                        setLocalPrices((prev) => ({ ...prev, [ficha.id]: e.target.value }))
                      }
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
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Nenhum produto cadastrado nesta categoria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Precificação de Produtos</h1>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">CMV Médio Atual</p>
            <p className={`text-3xl font-bold ${cmvColor(indicators.avgCmv)}`}>
              {fmtPct(indicators.avgCmv)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Semáforo CMV</p>
            <p className="text-3xl">
              {cmvEmoji(indicators.avgCmv)}{" "}
              <span className={`text-lg font-semibold ${cmvColor(indicators.avgCmv)}`}>
                {cmvMessage(indicators.avgCmv)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Produtos Fora da Meta</p>
            <p className="text-3xl font-bold text-foreground flex items-center gap-2">
              {indicators.foraMetaCount}
              {indicators.foraMetaCount > 0 && (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              )}
            </p>
          </CardContent>
        </Card>
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
  );
}
