import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const motivoLabel: Record<string, string> = {
  ficha_incompleta_embalagem_ou_insumo: "Falta embalagem ou ingrediente real",
};

export default function AutomacaoFichasWarnings() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: warnings = [], isLoading } = useQuery({
    queryKey: ["fichas-warnings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fichas_tecnicas_warnings")
        .select("*")
        .eq("resolvido", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resolverMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fichas_tecnicas_warnings")
        .update({ resolvido: true, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso marcado como resolvido");
      qc.invalidateQueries({ queryKey: ["fichas-warnings"] });
    },
  });

  const irParaFicha = (tipo: string) => {
    if (tipo === "pizza") navigate("/fichas/pizzas");
    else navigate("/fichas/sanduiches");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fichas Incompletas"
        description="Fichas técnicas que precisam de ajuste para o cálculo de custo funcionar corretamente."
      />

      {isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">Carregando...</Card>
      ) : warnings.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={CheckCircle2}
            title="Tudo certo!"
            description="Nenhuma ficha com problema. Todas as fichas têm embalagem e ingredientes completos."
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {warnings.map((w) => (
            <Card key={w.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-heading">
                  {motivoLabel[w.motivo] ?? w.motivo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(w.created_at), "dd/MM/yy HH:mm", { locale: ptBR })} ·{" "}
                  <Badge variant="outline" className="ml-1">
                    {w.tipo_ficha}
                  </Badge>
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => irParaFicha(w.tipo_ficha)}>
                <ArrowRight size={14} className="mr-1" />
                Abrir ficha
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resolverMut.mutate(w.id)}
                disabled={resolverMut.isPending}
              >
                Marcar resolvido
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
