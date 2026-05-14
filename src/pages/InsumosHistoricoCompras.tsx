import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Search } from "lucide-react";
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
  nome_original: string;
  fornecedor: string | null;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  preco_total: number | null;
  nota_fiscal_id: string | null;
  insumos_comprados: { nome: string; categoria: string | null } | null;
};

const ORIGENS = [
  { value: "todas", label: "Todas" },
  { value: "manual", label: "Manual" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "importacao", label: "Importação" },
];

export default function InsumosHistoricoCompras() {
  const unidadeId = useActiveUnidadeId();
  const [params] = useSearchParams();
  const insumoFiltro = params.get("insumo") ?? "";
  const [busca, setBusca] = useState(insumoFiltro);
  const [fornecedorFiltro, setFornecedorFiltro] = useState<string>("todos");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["insumos_historico", unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insumos_compras_historico")
        .select("id, data_compra, insumo_id, nome_original, fornecedor, quantidade, unidade_medida, preco_unitario, preco_total, nota_fiscal_id, insumos_comprados(nome, categoria)")
        .eq("unidade_id", unidadeId!)
        .order("data_compra", { ascending: false })
        .limit(1000);
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
      if (fornecedorFiltro !== "todos" && r.fornecedor !== fornecedorFiltro) return false;
      if (!q) return true;
      return (
        r.nome_original?.toLowerCase().includes(q) ||
        r.insumos_comprados?.nome?.toLowerCase().includes(q) ||
        r.fornecedor?.toLowerCase().includes(q)
      );
    });
  }, [rows, busca, fornecedorFiltro]);

  return (
    <div className="space-y-6 page-enter">
      <InsumosCategoryTabs />
      <InsumosSubTabs />
      <PageHeader
        title="Histórico de Compras"
        description="Memória completa de todas as compras realizadas — não substitui o cadastro de insumos."
      />

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
        <Select value={fornecedorFiltro} onValueChange={setFornecedorFiltro}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os fornecedores</SelectItem>
            {fornecedores.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length} compra{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nenhuma compra encontrada"
          description="As compras aparecem aqui automaticamente quando uma nota fiscal é processada ou um insumo é cadastrado."
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm fade-up fade-up-d1">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Data</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Insumo (cadastro)</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Nome original na nota</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Fornecedor</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Qtd</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Preço unit.</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider text-right">Total</TableHead>
                <TableHead className="font-bold text-foreground uppercase text-[11px] tracking-wider">Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, idx) => (
                <TableRow key={r.id} className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {new Date(r.data_compra + "T00:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {r.insumos_comprados?.nome ?? <span className="text-muted-foreground italic">(sem vínculo)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.nome_original}</TableCell>
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
                    <Badge variant={r.nota_fiscal_id ? "default" : "secondary"} className="font-normal">
                      {r.nota_fiscal_id ? "Nota fiscal" : "Manual"}
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
