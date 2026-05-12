import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Activity, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusBadge: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "Sucesso", icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" },
  partial: { label: "Parcial", icon: AlertCircle, className: "bg-warning/15 text-warning border-warning/30" },
  failed: { label: "Falhou", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" },
  skipped_first_purchase: { label: "1ª compra", icon: AlertCircle, className: "bg-muted text-muted-foreground" },
  skipped_no_change: { label: "Sem mudança", icon: CheckCircle2, className: "bg-muted text-muted-foreground" },
};

export default function AutomacaoSaude() {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["workflow-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = runs.length;
  const sucesso = runs.filter((r) => r.status === "success").length;
  const falhas = runs.filter((r) => r.status === "failed").length;
  const taxa = total > 0 ? Math.round((sucesso / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saúde do Sistema"
        description="Histórico de execuções automáticas dos últimos dias."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Execuções (últimas 100)</p>
          <p className="text-3xl font-extrabold font-mono mt-1">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Taxa de sucesso</p>
          <p className="text-3xl font-extrabold font-mono mt-1 text-success">{taxa}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Falhas</p>
          <p className={`text-3xl font-extrabold font-mono mt-1 ${falhas > 0 ? "text-destructive" : ""}`}>{falhas}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nenhuma execução ainda"
            description="As execuções automáticas vão aparecer aqui assim que o agente começar a rodar."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Fichas</TableHead>
                <TableHead className="text-right">Alertas</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead className="text-right">Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => {
                const cfg = statusBadge[r.status] ?? statusBadge.failed;
                const Icon = cfg.icon;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.workflow_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.trigger_source}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cfg.className}>
                        <Icon size={12} className="mr-1" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.fichas_processadas}</TableCell>
                    <TableCell className="text-right font-mono">{r.alertas_criados}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.duration_ms ? `${r.duration_ms}ms` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(r.started_at), "dd/MM HH:mm:ss", { locale: ptBR })}
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
