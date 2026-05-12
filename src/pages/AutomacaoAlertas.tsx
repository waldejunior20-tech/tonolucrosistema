import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { fmt, fmtPct } from "@/lib/pricing-helpers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Alerta = {
  id: string;
  ficha_tecnica_id: string | null;
  nome_produto: string;
  cmv_anterior: number;
  cmv_atual: number;
  preco_sugerido: number;
  preco_sugerido_p: number | null;
  preco_sugerido_m: number | null;
  preco_sugerido_g: number | null;
  status: string;
  tipo_ficha: string;
  created_at: string;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  urgente: { label: "Urgente", className: "bg-destructive text-destructive-foreground" },
  atencao: { label: "Atenção", className: "bg-warning text-warning-foreground" },
  informativo: { label: "Informativo", className: "bg-info text-info-foreground" },
  pendente: { label: "Pendente", className: "bg-muted text-muted-foreground" },
};

export default function AutomacaoAlertas() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<Alerta | null>(null);

  const { data: alertas = [], isLoading } = useQuery({
    queryKey: ["alertas-cmv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas_cmv")
        .select("*")
        .neq("status", "resolvido")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Alerta[];
    },
  });

  const aceitarMut = useMutation({
    mutationFn: async (alerta: Alerta) => {
      // 1) Atualiza preço de venda na ficha (se tipo_ficha for pizza ou produto)
      if (alerta.ficha_tecnica_id) {
        if (alerta.tipo_ficha === "pizza") {
          const updates: { preco_venda_p?: number; preco_venda_m?: number; preco_venda_g?: number } = {};
          if (alerta.preco_sugerido_p) updates.preco_venda_p = alerta.preco_sugerido_p;
          if (alerta.preco_sugerido_m) updates.preco_venda_m = alerta.preco_sugerido_m;
          if (alerta.preco_sugerido_g) updates.preco_venda_g = alerta.preco_sugerido_g;
          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from("fichas_tecnicas_pizza")
              .update(updates)
              .eq("id", alerta.ficha_tecnica_id);
            if (error) throw error;
          }
        } else if (alerta.tipo_ficha === "produto") {
          const { error } = await supabase
            .from("fichas_tecnicas_produtos")
            .update({ preco_venda: alerta.preco_sugerido })
            .eq("id", alerta.ficha_tecnica_id);
          if (error) throw error;
        }
      }

      // 2) Marca alerta como resolvido
      const { error } = await supabase
        .from("alertas_cmv")
        .update({ status: "resolvido" })
        .eq("id", alerta.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preço atualizado e alerta resolvido");
      qc.invalidateQueries({ queryKey: ["alertas-cmv"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_pizza"] });
      qc.invalidateQueries({ queryKey: ["fichas_tecnicas_produtos", "all"] });
      setSelecionado(null);
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const ignorarMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alertas_cmv")
        .update({ status: "resolvido" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerta ignorado");
      qc.invalidateQueries({ queryKey: ["alertas-cmv"] });
      setSelecionado(null);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de CMV"
        description="Produtos com margem fora do ideal. Aceite o preço sugerido ou ajuste manualmente."
      />

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : alertas.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum alerta ativo"
            description="Todos os seus produtos estão com margem saudável."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {alertas.map((a) => {
            const cfg = statusConfig[a.status] ?? statusConfig.pendente;
            const variacao = a.cmv_atual - a.cmv_anterior;
            return (
              <Card key={a.id} className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} className="text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-text-heading truncate">{a.nome_produto}</p>
                    <p className="text-xs text-muted-foreground">
                      CMV {fmtPct(Number(a.cmv_anterior))} → <span className="font-bold">{fmtPct(Number(a.cmv_atual))}</span>{" "}
                      ({variacao > 0 ? "+" : ""}
                      {variacao.toFixed(1)} pp)
                    </p>
                  </div>
                </div>
                <Badge className={cfg.className}>{cfg.label}</Badge>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Preço sugerido
                  </p>
                  <p className="font-mono font-bold text-success">{fmt(Number(a.preco_sugerido))}</p>
                </div>
                <Button onClick={() => setSelecionado(a)} size="sm">
                  Revisar
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selecionado} onOpenChange={(o) => !o && setSelecionado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceitar preço sugerido?</DialogTitle>
            <DialogDescription>
              Vamos atualizar o preço de venda da ficha técnica e marcar este alerta como resolvido.
            </DialogDescription>
          </DialogHeader>

          {selecionado && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">
                  {selecionado.nome_produto}
                </p>
                {selecionado.tipo_ficha === "pizza" ? (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {(["p", "m", "g"] as const).map((sz) => {
                      const v = selecionado[`preco_sugerido_${sz}` as keyof Alerta] as number | null;
                      return v ? (
                        <div key={sz} className="text-center">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">
                            Tam {sz.toUpperCase()}
                          </p>
                          <p className="font-mono font-bold text-success">{fmt(Number(v))}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <ArrowRight size={16} className="text-muted-foreground" />
                    <p className="font-mono font-bold text-success text-lg">
                      {fmt(Number(selecionado.preco_sugerido))}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                CMV passa de <strong>{fmtPct(Number(selecionado.cmv_anterior))}</strong> para{" "}
                <strong>{fmtPct(Number(selecionado.cmv_atual))}</strong>.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => selecionado && ignorarMut.mutate(selecionado.id)}
              disabled={ignorarMut.isPending}
            >
              Ignorar alerta
            </Button>
            <Button
              onClick={() => selecionado && aceitarMut.mutate(selecionado)}
              disabled={aceitarMut.isPending}
            >
              {aceitarMut.isPending ? "Salvando..." : "Aceitar e atualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
