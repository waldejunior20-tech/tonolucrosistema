import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { History, Search, ShieldAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { formatMoney } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  ComprasPeriodoChips,
  type PeriodoValue,
} from "@/components/compras/ComprasPeriodoChips";
import { ComprasGraficoFornecedor } from "@/components/compras/ComprasGraficoFornecedor";
import { CompraCard, type CompraGrupo } from "@/components/compras/CompraCard";
import { CupomCompraSheet, type CupomItem } from "@/components/compras/CupomCompraSheet";
import { Money } from "@/components/Money";
import { PageHero } from "@/components/layout/PageHero";

type Row = {
  id: string;
  data_compra: string;
  insumo_id: string | null;
  insumo_canonico_nome: string | null;
  insumo_categoria: string | null;
  nome_original: string;
  fornecedor: string | null;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  preco_total: number | null;
  destino: string;
  origem: string;
  nota_fiscal_id: string | null;
};

function getPeriodoRange(
  periodo: PeriodoValue,
  custom?: DateRange
): { from: Date; to: Date } | null {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (periodo === "custom") {
    if (!custom?.from) return null;
    const to = new Date(custom.to ?? custom.from);
    to.setHours(23, 59, 59, 999);
    const from = new Date(custom.from);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (periodo === "este_mes") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  const dias = parseInt(periodo, 10);
  const from = new Date(now);
  from.setDate(from.getDate() - dias);
  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}

function inRange(dataStr: string, range: { from: Date; to: Date } | null): boolean {
  if (!range) return true;
  const d = new Date(dataStr + "T00:00:00");
  return d >= range.from && d <= range.to;
}

function formatDayHeader(dataStr: string): string {
  const d = new Date(dataStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "HOJE · " + format(d, "dd MMM", { locale: ptBR }).toUpperCase();
  if (diff === 1) return "ONTEM · " + format(d, "dd MMM", { locale: ptBR }).toUpperCase();
  return format(d, "EEEE · dd MMM", { locale: ptBR }).toUpperCase();
}

export default function InsumosHistoricoCompras() {
  const { activeUnidadeId: unidadeId } = useActiveUnidade();
  const [params] = useSearchParams();
  const insumoFiltro = params.get("insumo") ?? "";
  const [busca, setBusca] = useState(insumoFiltro);
  const [periodo, setPeriodo] = useState<PeriodoValue>("30");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string | null>(null);
  const [cupomKey, setCupomKey] = useState<string | null>(null);

  const { data: precosBloqueados30d = 0 } = useQuery({
    queryKey: ["precos_bloqueados_30d", unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { count, error } = await supabase
        .from("auditoria_correcoes_precos")
        .select("id", { count: "exact", head: true })
        .eq("unidade_id", unidadeId!)
        .eq("motivo", "preco_suspeito_bloqueado")
        .gte("created_at", cutoff.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["insumos_historico_v2", unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_historico_compras_completo" as any)
        .select("*")
        .eq("unidade_id", unidadeId!)
        .order("data_compra", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const range = useMemo(() => getPeriodoRange(periodo, customRange), [periodo, customRange]);

  // Filtra rows pelo período + busca + fornecedor selecionado no gráfico
  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inRange(r.data_compra, range)) return false;
      if (fornecedorFiltro && r.fornecedor !== fornecedorFiltro) return false;
      if (!q) return true;
      return (
        r.nome_original?.toLowerCase().includes(q) ||
        r.insumo_canonico_nome?.toLowerCase().includes(q) ||
        r.fornecedor?.toLowerCase().includes(q)
      );
    });
  }, [rows, busca, range, fornecedorFiltro]);

  const totalPeriodo = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => acc + Number(r.preco_total ?? r.preco_unitario * r.quantidade),
        0
      ),
    [filtered]
  );

  // Período anterior pra variação
  const totalAnterior = useMemo(() => {
    if (!range) return 0;
    const len = range.to.getTime() - range.from.getTime();
    const prevTo = new Date(range.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - len);
    return rows
      .filter((r) => inRange(r.data_compra, { from: prevFrom, to: prevTo }))
      .reduce(
        (acc, r) => acc + Number(r.preco_total ?? r.preco_unitario * r.quantidade),
        0
      );
  }, [rows, range]);

  const variacaoPct =
    totalAnterior > 0 ? ((totalPeriodo - totalAnterior) / totalAnterior) * 100 : null;

  // Agrupa em "compras" (1 compra = mesmo fornecedor + mesmo dia, ou mesma nota_fiscal_id)
  const compras = useMemo(() => {
    const map = new Map<string, { rows: Row[]; fornecedor: string; data_compra: string }>();
    filtered.forEach((r) => {
      const key = r.nota_fiscal_id ?? `${r.fornecedor ?? "—"}__${r.data_compra}`;
      if (!map.has(key)) {
        map.set(key, {
          rows: [],
          fornecedor: r.fornecedor ?? "Sem fornecedor",
          data_compra: r.data_compra,
        });
      }
      map.get(key)!.rows.push(r);
    });
    const arr = Array.from(map.entries()).map(([key, g]) => {
      const total = g.rows.reduce(
        (acc, r) => acc + Number(r.preco_total ?? r.preco_unitario * r.quantidade),
        0
      );
      const grupo: CompraGrupo = {
        key,
        fornecedor: g.fornecedor,
        data_compra: g.data_compra,
        total,
        itensCount: g.rows.length,
      };
      return { grupo, rows: g.rows };
    });
    arr.sort((a, b) => b.grupo.data_compra.localeCompare(a.grupo.data_compra));
    return arr;
  }, [filtered]);

  // Agrupa as compras por dia
  const comprasPorDia = useMemo(() => {
    const map = new Map<string, typeof compras>();
    compras.forEach((c) => {
      const key = c.grupo.data_compra;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries());
  }, [compras]);

  // Variação por insumo: usa todo o `rows` (não só o período) pra comparar com a compra anterior
  const variacaoPorRow = useMemo(() => {
    const ultimoPreco = new Map<string, number>(); // insumo_id => preço da compra mais recente ANTES desta
    const sorted = [...rows].sort((a, b) => a.data_compra.localeCompare(b.data_compra));
    const out = new Map<string, number | null>();
    sorted.forEach((r) => {
      const idKey = r.insumo_id ?? r.nome_original;
      const prev = ultimoPreco.get(idKey);
      if (prev === undefined) {
        out.set(r.id, null);
      } else if (prev === 0) {
        out.set(r.id, null);
      } else {
        out.set(r.id, ((Number(r.preco_unitario) - prev) / prev) * 100);
      }
      ultimoPreco.set(idKey, Number(r.preco_unitario));
    });
    return out;
  }, [rows]);

  const cupomData = useMemo(() => {
    if (!cupomKey) return null;
    const found = compras.find((c) => c.grupo.key === cupomKey);
    if (!found) return null;
    const itens: CupomItem[] = found.rows.map((r) => ({
      id: r.id,
      nome: r.insumo_canonico_nome ?? r.nome_original,
      nome_original: r.nome_original,
      quantidade: Number(r.quantidade),
      unidade_medida: r.unidade_medida,
      preco_unitario: Number(r.preco_unitario),
      preco_total: Number(r.preco_total ?? r.preco_unitario * r.quantidade),
      variacao_pct: variacaoPorRow.get(r.id) ?? null,
      insumo_id: r.insumo_id,
    }));
    return {
      fornecedor: found.grupo.fornecedor,
      data_compra: found.grupo.data_compra,
      itens,
    };
  }, [cupomKey, compras, variacaoPorRow]);

  const periodoLabel =
    periodo === "este_mes"
      ? "Este mês"
      : periodo === "custom"
      ? "Período personalizado"
      : `Últimos ${periodo} dias`;

  return (
    <div className="space-y-4 page-enter pb-6">
      <PageHeader
        title="Histórico de Compras"
        description="Tudo que entrou em insumos, embalagens e despesas."
      />

      <PageHero
        label={periodoLabel}
        value={totalPeriodo}
        context={
          <>
            {compras.length} {compras.length === 1 ? "compra" : "compras"} ·{" "}
            {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            {variacaoPct !== null && (
              <span
                className={
                  "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold " +
                  (variacaoPct >= 0
                    ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-200/40"
                    : "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-200/40")
                }
              >
                {variacaoPct >= 0 ? "▲" : "▼"} {Math.abs(variacaoPct).toFixed(1)}% vs. período anterior
              </span>
            )}
          </>
        }
        rightSlot={
          <ComprasPeriodoChips
            periodo={periodo}
            customRange={customRange}
            onChange={(p, r) => {
              setPeriodo(p);
              if (p === "custom") setCustomRange(r);
            }}
          />
        }
      />

      {/* Gráfico por fornecedor */}
      <ComprasGraficoFornecedor
        rows={filtered}
        selectedFornecedor={fornecedorFiltro}
        onSelectFornecedor={setFornecedorFiltro}
      />

      {/* Alerta preços bloqueados */}
      {precosBloqueados30d > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs">
          <ShieldAlert className="h-4 w-4 text-warning shrink-0" />
          <span className="text-warning-foreground">
            <strong className="tabular-nums">{precosBloqueados30d}</strong> aumento(s)
            suspeito(s) bloqueado(s) nos últimos 30 dias
          </span>
        </div>
      )}

      {/* Busca + Lista — um único card branco com sombra suave */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por mercado, insumo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-10 rounded-lg bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : compras.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhuma compra encontrada"
              description="Ajuste o período ou aguarde a próxima nota fiscal ser processada."
            />
          ) : (
            <div className="space-y-5">
              {comprasPorDia.map(([dia, lista]) => (
                <div key={dia}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 px-1">
                    {formatDayHeader(dia)}
                  </div>
                  <div className="space-y-2">
                    {lista.map((c) => (
                      <CompraCard
                        key={c.grupo.key}
                        compra={c.grupo}
                        onClick={() => setCupomKey(c.grupo.key)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cupomData && (
        <CupomCompraSheet
          open={!!cupomKey}
          onOpenChange={(v) => !v && setCupomKey(null)}
          fornecedor={cupomData.fornecedor}
          data_compra={cupomData.data_compra}
          itens={cupomData.itens}
        />
      )}
    </div>
  );
}
