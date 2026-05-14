import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search, TrendingUp, ShieldAlert } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { formatMoney, formatQuantidade } from "@/components/MoneyInput";
import { PageHeader } from "@/components/layout/PageHeader";
import { InsumosCategoryTabs } from "@/components/insumos/InsumosCategoryTabs";
import { InsumosSubTabs } from "@/components/insumos/InsumosSubTabs";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonTable } from "@/components/SkeletonCard";
import { useActiveUnidade } from "@/hooks/useActiveUnidade";

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
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "este_mes", label: "Este mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "tudo", label: "Tudo" },
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

function inPeriodo(dataStr: string, periodo: string): boolean {
  if (periodo === "tudo") return true;
  const d = new Date(dataStr + "T00:00:00");
  const now = new Date();
  if (periodo === "este_mes") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (periodo === "mes_passado") {
    const mp = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getFullYear() === mp.getFullYear() && d.getMonth() === mp.getMonth();
  }
  const dias = parseInt(periodo, 10);
  if (Number.isNaN(dias)) return true;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - dias);
  return d >= cutoff;
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

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inPeriodo(r.data_compra, periodo)) return false;
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
  }, [rows, busca, fornecedorFiltro, destinoFiltro, origemFiltro, periodo]);

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

  return (
    <div className="space-y-6 page-enter">
      <InsumosCategoryTabs />
      <InsumosSubTabs />
      <PageHeader
        title="Histórico de Compras"
        description="Memória completa de tudo que foi comprado — insumos, embalagens e despesas."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-up">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total no período</div>
          <div className="text-2xl font-bold tabular-nums text-foreground mt-1">{formatMoney(kpis.total)}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Compras</div>
          <div className="text-2xl font-bold tabular-nums text-foreground mt-1">{kpis.count}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Maior fornecedor
          </div>
          <div className="text-sm font-bold text-foreground mt-1 truncate">{kpis.topFornecedor?.nome ?? "—"}</div>
          <div className="text-xs tabular-nums text-muted-foreground">{kpis.topFornecedor ? formatMoney(kpis.topFornecedor.valor) : ""}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Preços bloqueados (30d)
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground mt-1">{precosBloqueados30d}</div>
          <div className="text-xs text-muted-foreground">aumentos suspeitos travados</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por insumo, nome na nota ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fornecedorFiltro} onValueChange={setFornecedorFiltro}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os fornecedores</SelectItem>
            {fornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={destinoFiltro} onValueChange={setDestinoFiltro}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DESTINOS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
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
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm fade-up fade-up-d1">
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
