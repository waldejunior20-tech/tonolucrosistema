import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { History, Search, TrendingUp, ShieldAlert, CalendarIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { formatMoney, formatQuantidade } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { InsumosCategoryTabs } from "@/components/insumos/InsumosCategoryTabs";
import { InsumosSubTabs } from "@/components/insumos/InsumosSubTabs";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

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

const PERIODOS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
  { value: "90", label: "90 dias" },
  { value: "este_mes", label: "Este mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "tudo", label: "Tudo" },
  { value: "custom", label: "Personalizado" },
];

const DESTINOS = [
  { value: "todos", label: "Todos os destinos" },
  { value: "insumo", label: "Insumo" },
  { value: "embalagem", label: "Embalagem" },
  { value: "financeiro", label: "Financeiro" },
  { value: "conta_pagar", label: "Conta a pagar" },
  { value: "revisar", label: "A revisar" },
];

const ORIGENS = [
  { value: "todos", label: "Todas as origens" },
  { value: "manual", label: "Manual" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "n8n", label: "n8n / Importação" },
  { value: "import", label: "Importação" },
];

function getPeriodoRange(periodo: string, custom?: DateRange): { from: Date; to: Date } | null {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (periodo === "tudo") return null;
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
  if (periodo === "mes_passado") {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
  }
  const dias = parseInt(periodo, 10);
  if (Number.isNaN(dias)) return null;
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

export default function InsumosHistoricoCompras() {
  const { activeUnidadeId: unidadeId } = useActiveUnidade();
  const [params] = useSearchParams();
  const insumoFiltro = params.get("insumo") ?? "";
  const [busca, setBusca] = useState(insumoFiltro);
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string>("todos");
  const [destinoFiltro, setDestinoFiltro] = useState<string>("todos");
  const [origemFiltro, setOrigemFiltro] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<string>("30");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const fornecedores = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.fornecedor && s.add(r.fornecedor));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rows]);

  const range = useMemo(() => getPeriodoRange(periodo, customRange), [periodo, customRange]);

  const periodoLabel = useMemo(() => {
    if (periodo === "tudo") return "Todo o período";
    if (periodo === "custom" && customRange?.from) {
      const from = format(customRange.from, "dd/MM", { locale: ptBR });
      const to = format(customRange.to ?? customRange.from, "dd/MM", { locale: ptBR });
      return `${from} – ${to}`;
    }
    const found = PERIODOS.find((p) => p.value === periodo);
    if (!found) return "Período";
    if (["7", "30", "60", "90"].includes(periodo)) return `Últimos ${periodo} dias`;
    return found.label;
  }, [periodo, customRange]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inRange(r.data_compra, range)) return false;
      if (fornecedorFiltro !== "todos" && r.fornecedor !== fornecedorFiltro) return false;
      if (destinoFiltro !== "todos" && r.destino !== destinoFiltro) return false;
      if (origemFiltro !== "todos" && r.origem !== origemFiltro) return false;
      if (!q) return true;
      return (
        r.nome_original?.toLowerCase().includes(q) ||
        r.insumo_canonico_nome?.toLowerCase().includes(q) ||
        r.fornecedor?.toLowerCase().includes(q)
      );
    });
  }, [rows, busca, fornecedorFiltro, destinoFiltro, origemFiltro, range]);

  const kpis = useMemo(() => {
    const total = filtered.reduce((acc, r) => acc + Number(r.preco_total ?? r.preco_unitario * r.quantidade), 0);
    const porFornecedor = new Map<string, number>();
    filtered.forEach((r) => {
      if (!r.fornecedor) return;
      porFornecedor.set(r.fornecedor, (porFornecedor.get(r.fornecedor) ?? 0) + Number(r.preco_total ?? 0));
    });
    let topF: { nome: string; valor: number } | null = null;
    porFornecedor.forEach((v, k) => {
      if (!topF || v > topF.valor) topF = { nome: k, valor: v };
    });
    return { total, topFornecedor: topF, count: filtered.length };
  }, [filtered]);

  // Série diária para o gráfico
  const chartData = useMemo(() => {
    if (!range) {
      // Sem range: usa últimos 30 dias do dataset filtrado
      const map = new Map<string, number>();
      filtered.forEach((r) => {
        const v = Number(r.preco_total ?? r.preco_unitario * r.quantidade);
        map.set(r.data_compra, (map.get(r.data_compra) ?? 0) + v);
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-30)
        .map(([data, total]) => ({
          data,
          label: format(new Date(data + "T00:00:00"), "dd/MM"),
          total,
        }));
    }
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const v = Number(r.preco_total ?? r.preco_unitario * r.quantidade);
      map.set(r.data_compra, (map.get(r.data_compra) ?? 0) + v);
    });
    // Preencher dias vazios
    const out: { data: string; label: string; total: number }[] = [];
    const cur = new Date(range.from);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(range.to);
    end.setHours(0, 0, 0, 0);
    let safety = 0;
    while (cur <= end && safety++ < 400) {
      const key = format(cur, "yyyy-MM-dd");
      out.push({
        data: key,
        label: format(cur, "dd/MM"),
        total: map.get(key) ?? 0,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [filtered, range]);

  const showChart = chartData.length > 1 && kpis.total > 0;

  return (
    <div className="space-y-5 page-enter">
      <InsumosCategoryTabs />
      <InsumosSubTabs />
      <PageHeader
        title="Histórico de Compras"
        description="Memória completa de tudo que foi comprado — insumos, embalagens e despesas."
      />

      {/* HERO — total do período + seletor */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 fade-up">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              {periodoLabel}
            </div>
            <div className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground mt-1 leading-none">
              {formatMoney(kpis.total)}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              {kpis.count} {kpis.count === 1 ? "compra" : "compras"} no período
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={periodo}
              onValueChange={(v) => {
                setPeriodo(v);
                if (v === "custom") setCalendarOpen(true);
              }}
            >
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setPeriodo("custom")}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(r) => {
                    setCustomRange(r);
                    setPeriodo("custom");
                    if (r?.from && r?.to) setCalendarOpen(false);
                  }}
                  numberOfMonths={1}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Gráfico de compras por dia */}
        {showChart && (
          <div className="h-[160px] -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatMoney(v), "Compras"]}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 gap-3 fade-up fade-up-d1">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-semibold">
            <TrendingUp className="h-3 w-3" /> Maior fornecedor
          </div>
          <div className="text-sm font-bold text-foreground mt-1.5 truncate">{kpis.topFornecedor?.nome ?? "—"}</div>
          <div className="text-xs tabular-nums text-muted-foreground mt-0.5">
            {kpis.topFornecedor ? formatMoney(kpis.topFornecedor.valor) : ""}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-semibold">
            <ShieldAlert className="h-3 w-3" /> Preços bloqueados
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground mt-1">{precosBloqueados30d}</div>
          <div className="text-xs text-muted-foreground">aumentos suspeitos travados (30d)</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 fade-up fade-up-d2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar insumo, nome na nota ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={fornecedorFiltro} onValueChange={setFornecedorFiltro}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os fornecedores</SelectItem>
            {fornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={destinoFiltro} onValueChange={setDestinoFiltro}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DESTINOS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORIGENS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhuma compra encontrada"
          description="Ajuste os filtros ou aguarde a próxima nota fiscal ser processada."
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm fade-up fade-up-d3">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Data</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Insumo</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Nome original</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Qtd</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Preço unit.</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Total</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Destino</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, idx) => (
                <TableRow key={r.id} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <TableCell className="tabular-nums text-muted-foreground text-xs">
                    {new Date(r.data_compra + "T00:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {r.insumo_canonico_nome ?? <span className="text-muted-foreground italic text-xs">(sem vínculo)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{r.nome_original}</TableCell>
                  <TableCell className="text-muted-foreground">{r.fornecedor ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatQuantidade(Number(r.quantidade), r.unidade_medida)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-foreground">
                    {formatMoney(Number(r.preco_unitario))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {formatMoney(Number(r.preco_total ?? r.preco_unitario * r.quantidade))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={r.destino === "revisar" ? "destructive" : r.destino === "insumo" ? "default" : "secondary"}
                      className="font-normal"
                    >
                      {r.destino}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
