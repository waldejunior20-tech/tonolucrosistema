import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { TrendingDown, TrendingUp, History } from "lucide-react";
import { fmt, fmtPct } from "@/lib/pricing-helpers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AutomacaoHistoricoPrecos() {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-precos-insumos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_precos_insumos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Preços"
        description="Variações de preço dos seus insumos detectadas automaticamente. Atualizado pelo agente de automação."
      />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Carregando...</div>
        ) : historico.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma variação registrada ainda"
            description="Quando o agente detectar mudança de preço em um insumo, ela aparece aqui."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Preço anterior</TableHead>
                <TableHead className="text-right">Preço novo</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((row) => {
                const subiu = Number(row.variacao_percentual) > 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nome_insumo}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {fmt(Number(row.preco_anterior))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {fmt(Number(row.preco_novo))}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold ${
                          subiu ? "text-destructive" : "text-success"
                        }`}
                      >
                        {subiu ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {subiu ? "+" : ""}
                        {fmtPct(Number(row.variacao_percentual))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.created_by === "user" ? "secondary" : "default"}>
                        {row.created_by === "user" ? "Manual" : "Automático"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(row.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
